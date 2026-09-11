"use server";

import { revalidatePath } from "next/cache";

import {
  AuthorizationError,
  canAddInternalTicketNotes,
  canAssignTickets,
  canChangeTicketAssignee,
  canClaimUnassignedTickets,
  canCreateTicketForOtherMembers,
  canCreateTickets,
  canReplyToOrganizationTicket,
  canUpdateTicketStatus,
  canViewOrganizationAssets,
  getAuthorizedWorkspace,
  isAssignableTicketAssignee,
  type WorkspaceRole,
} from "@/features/auth/server/authorization";
import {
  createNewTicketNotifications,
  createTicketNotifications,
} from "@/features/notifications/server/notification-center";
import {
  addTicketInternalNoteActionSchema,
  addTicketReplyActionSchema,
  createTicketActionSchema,
  type AddTicketInternalNoteActionInput,
  type AddTicketReplyActionInput,
  type CreateTicketActionInput,
  type UpdateTicketAssigneeActionInput,
  type UpdateTicketStatusActionInput,
  updateTicketAssigneeActionSchema,
  updateTicketStatusActionSchema,
} from "@/features/tickets/schemas/ticket-actions";
import { defaultServiceLevelPolicies } from "@/features/settings/constants/service-level-policies";
import type { TicketActionResult } from "@/features/tickets/types/ticket-actions";
import { shouldRecordFirstResponse } from "@/features/tickets/utils/ticket-sla";
import { prisma } from "@/lib/prisma";

const MAX_TRANSACTION_ATTEMPTS = 3;

const requestTypeToDatabaseType = {
  Incident: "INCIDENT",
  "Service request": "SERVICE_REQUEST",
} as const;

const priorityToDatabasePriority = {
  Urgent: "URGENT",
  High: "HIGH",
  Normal: "NORMAL",
  Low: "LOW",
} as const;

const statusToDatabaseStatus = {
  Open: "OPEN",
  Unassigned: "OPEN",
  Investigating: "TRIAGED",
  "In progress": "IN_PROGRESS",
  "Waiting requester": "WAITING_REQUESTER",
  Scheduled: "SCHEDULED",
} as const;

type ActorContext = {
  organizationId: string;
  actorId: string;
  actorName: string;
  role: WorkspaceRole;
};

class MutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MutationError";
  }
}

function addMinutes(
  date: Date,
  minutes: number,
) {
  return new Date(
    date.getTime() +
      minutes * 60_000,
  );
}

function firstValidationMessage(
  issues: Array<{
    message: string;
  }>,
) {
  return (
    issues[0]?.message ??
    "The submitted data is invalid."
  );
}

function isPrismaErrorWithCode(
  error: unknown,
  codes: string[],
) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  return codes.includes(
    String(error.code),
  );
}

function mutationFailure(
  error: unknown,
): TicketActionResult {
  if (
    error instanceof MutationError ||
    error instanceof AuthorizationError
  ) {
    return {
      success: false,
      message: error.message,
    };
  }

  console.error(
    "DeskOps ticket mutation failed:",
    error,
  );

  return {
    success: false,
    message:
      "DeskOps could not complete this operation. Please try again.",
  };
}

async function getActorContext(): Promise<ActorContext> {
  const workspace =
    await getAuthorizedWorkspace();

  return {
    organizationId:
      workspace.organization.id,
    actorId: workspace.user.id,
    actorName: workspace.user.name,
    role: workspace.membership.role,
  };
}

async function createTicketWithRetry({
  input,
  organizationId,
  actorId,
  actorName,
  requesterId,
  assetId,
  source,
}: {
  input: CreateTicketActionInput;
  organizationId: string;
  actorId: string;
  actorName: string;
  requesterId: string;
  assetId: string | null;
  source: "PORTAL" | "MANUAL";
}) {
  for (
    let attempt = 1;
    attempt <=
    MAX_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const databasePriority =
            priorityToDatabasePriority[
              input.priority
            ];

          const configuredTarget =
            await transaction.serviceLevelPolicy.findUnique(
              {
                where: {
                  organizationId_priority: {
                    organizationId,
                    priority:
                      databasePriority,
                  },
                },
                select: {
                  firstResponseMinutes:
                    true,
                  resolutionMinutes: true,
                },
              },
            );

          const target =
            configuredTarget ??
            defaultServiceLevelPolicies[
              databasePriority
            ];

          const latestTicketNumber =
            await transaction.ticket.aggregate({
              where: {
                organizationId,
              },
              _max: {
                number: true,
              },
            });

          const number =
            (latestTicketNumber._max
              .number ?? 0) + 1;

          const now = new Date();

          const ticket =
            await transaction.ticket.create({
              data: {
                organizationId,
                number,
                type: requestTypeToDatabaseType[
                  input.requestType
                ],
                title: input.title,
                description:
                  input.description,
                priority:
                  databasePriority,
                status: "OPEN",
                source,
                category: input.category,
                requesterId,
                assetId,
                firstResponseDueAt:
                  addMinutes(
                    now,
                    target
                      .firstResponseMinutes,
                  ),
                resolutionDueAt:
                  addMinutes(
                    now,
                    target
                      .resolutionMinutes,
                  ),
              },
              select: {
                id: true,
                number: true,
                type: true,
              },
            });

          const ticketDisplayId = `${
            ticket.type === "INCIDENT"
              ? "INC"
              : "REQ"
          }-${ticket.number}`;

          await transaction.ticketEvent.create({
            data: {
              ticketId: ticket.id,
              actorId,
              action:
                "TICKET_CREATED",
              toValue:
                ticketDisplayId,
              metadata: {
                source:
                  "operations-dashboard",
                requestType:
                  input.requestType,
                priority:
                  input.priority,
              },
            },
          });

          if (source === "PORTAL") {
            await createNewTicketNotifications(
              transaction,
              {
                organizationId,
                actorId,
                actorName,
                ticket: {
                  id: ticket.id,
                  number: ticket.number,
                  type: ticket.type,
                  title: input.title,
                  requesterId,
                  assigneeId: null,
                },
              },
            );
          }

          return {
            id: ticket.id,
            displayId:
              ticketDisplayId,
          };
        },
        {
          isolationLevel:
            "Serializable",
        },
      );
    } catch (error) {
      const retryable =
        isPrismaErrorWithCode(
          error,
          ["P2002", "P2034"],
        );

      if (
        retryable &&
        attempt <
          MAX_TRANSACTION_ATTEMPTS
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new MutationError(
    "A ticket number could not be reserved.",
  );
}

export async function createTicketAction(
  rawInput: CreateTicketActionInput,
): Promise<TicketActionResult> {
  const validation =
    createTicketActionSchema.safeParse(
      rawInput,
    );

  if (!validation.success) {
    return {
      success: false,
      message:
        firstValidationMessage(
          validation.error.issues,
        ),
    };
  }

  try {
    const actor =
      await getActorContext();

    if (
      !canCreateTickets(actor.role)
    ) {
      throw new AuthorizationError(
        "Your current role cannot create tickets.",
      );
    }

    const input = validation.data;

    const requesterId =
      canCreateTicketForOtherMembers(
        actor.role,
      )
        ? input.requesterId
        : actor.actorId;

    const requesterMembership =
      await prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId:
              actor.organizationId,
            userId: requesterId,
          },
        },
        select: {
          userId: true,
          status: true,
        },
      });

    if (
      !requesterMembership ||
      requesterMembership.status !==
        "ACTIVE"
    ) {
      throw new MutationError(
        "The selected requester is not an active organization member.",
      );
    }

    let assetId: string | null =
      null;

    if (input.assetId) {
      const asset =
        await prisma.asset.findFirst({
          where: {
            id: input.assetId,
            organizationId:
              actor.organizationId,
            status: {
              notIn: [
                "RETIRED",
                "LOST",
              ],
            },
            ...(canViewOrganizationAssets(
              actor.role,
            )
              ? {}
              : {
                  assignedToId:
                    actor.actorId,
                }),
          },
          select: {
            id: true,
          },
        });

      if (!asset) {
        throw new MutationError(
          "The selected asset is no longer available.",
        );
      }

      assetId = asset.id;
    }

    const ticket =
      await createTicketWithRetry({
        input,
        organizationId:
          actor.organizationId,
        actorId: actor.actorId,
        actorName: actor.actorName,
        requesterId:
          requesterMembership.userId,
        assetId,
        source:
          actor.role === "EMPLOYEE"
            ? "PORTAL"
            : "MANUAL",
      });

    revalidatePath("/");

    return {
      success: true,
      message: `${ticket.displayId} was created successfully.`,
      ticketId: ticket.id,
      ticketDisplayId:
        ticket.displayId,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function updateTicketAssigneeAction(
  rawInput: UpdateTicketAssigneeActionInput,
): Promise<TicketActionResult> {
  const validation =
    updateTicketAssigneeActionSchema.safeParse(
      rawInput,
    );

  if (!validation.success) {
    return {
      success: false,
      message:
        firstValidationMessage(
          validation.error.issues,
        ),
    };
  }

  try {
    const actor =
      await getActorContext();

    if (
      !canAssignTickets(actor.role) &&
      !canClaimUnassignedTickets(
        actor.role,
      )
    ) {
      throw new AuthorizationError(
        "Your current role cannot assign tickets.",
      );
    }

    const input = validation.data;

    const result =
      await prisma.$transaction(
        async (transaction) => {
          const ticket =
            await transaction.ticket.findFirst({
              where: {
                id: input.ticketId,
                organizationId:
                  actor.organizationId,
                status: {
                  notIn: [
                    "RESOLVED",
                    "CLOSED",
                    "CANCELED",
                  ],
                },
              },
              select: {
                id: true,
                number: true,
                type: true,
                title: true,
                requesterId: true,
                assigneeId: true,
                assignee: {
                  select: {
                    name: true,
                  },
                },
                approvals: {
                  where: {
                    status: "PENDING",
                  },
                  select: {
                    id: true,
                  },
                  take: 1,
                },
              },
            });

          if (!ticket) {
            throw new MutationError(
              "The selected active ticket could not be found.",
            );
          }

          let nextAssignee: {
            id: string;
            name: string;
          } | null = null;

          if (input.assigneeId) {
            const membership =
              await transaction.membership.findFirst({
                where: {
                  organizationId:
                    actor.organizationId,
                  userId:
                    input.assigneeId,
                },
                select: {
                  role: true,
                  status: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              });

            if (
              !membership ||
              !isAssignableTicketAssignee(
                membership.role,
                membership.status,
              )
            ) {
              throw new MutationError(
                "The selected assignee is not an active technician in this organization.",
              );
            }

            nextAssignee =
              membership.user;
          }

          const nextAssigneeId =
            nextAssignee?.id ?? null;

          if (
            ticket.assigneeId ===
            nextAssigneeId
          ) {
            return {
              changed: false,
              assigneeName:
                nextAssignee?.name ??
                "Unassigned",
            };
          }

          if (
            ticket.approvals.length > 0
          ) {
            throw new MutationError(
              "Resolve the pending approval before changing the ticket assignee.",
            );
          }

          if (
            !canChangeTicketAssignee({
              role: actor.role,
              actorId: actor.actorId,
              currentAssigneeId:
                ticket.assigneeId,
              nextAssigneeId,
            })
          ) {
            throw new AuthorizationError(
              actor.role === "TECHNICIAN"
                ? "Technicians can only assign an unassigned ticket to themselves."
                : "Your current role cannot change this ticket assignment.",
            );
          }

          await transaction.ticket.update({
            where: {
              id: ticket.id,
            },
            data: nextAssignee
              ? {
                  assigneeId:
                    nextAssignee.id,
                }
              : {
                  assigneeId: null,
                  status: "OPEN",
                  resolvedAt: null,
                  closedAt: null,
                },
          });

          await transaction.ticketEvent.create({
            data: {
              ticketId: ticket.id,
              actorId: actor.actorId,
              action: "ASSIGNEE_CHANGED",
              fromValue:
                ticket.assignee?.name ??
                null,
              toValue:
                nextAssignee?.name ??
                null,
              metadata: {
                source:
                  "operations-dashboard",
                fromAssigneeId:
                  ticket.assigneeId,
                toAssigneeId:
                  nextAssigneeId,
              },
            },
          });

          if (nextAssigneeId) {
            await createTicketNotifications(
              transaction,
              {
                organizationId:
                  actor.organizationId,
                actorId:
                  actor.actorId,
                actorName:
                  actor.actorName,
                event: "ASSIGNED",
                ticket: {
                  id: ticket.id,
                  number:
                    ticket.number,
                  type: ticket.type,
                  title: ticket.title,
                  requesterId:
                    ticket.requesterId,
                  assigneeId:
                    nextAssigneeId,
                },
              },
            );
          }

          return {
            changed: true,
            assigneeName:
              nextAssignee?.name ??
              "Unassigned",
          };
        },
        {
          isolationLevel:
            "Serializable",
        },
      );

    revalidatePath("/");

    return {
      success: true,
      message: result.changed
        ? validation.data.assigneeId ===
          null
          ? "Ticket returned to the unassigned queue."
          : `Ticket assigned to ${result.assigneeName}.`
        : "The ticket already has that assignee.",
      ticketId:
        validation.data.ticketId,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function updateTicketStatusAction(
  rawInput: UpdateTicketStatusActionInput,
): Promise<TicketActionResult> {
  const validation =
    updateTicketStatusActionSchema.safeParse(
      rawInput,
    );

  if (!validation.success) {
    return {
      success: false,
      message:
        firstValidationMessage(
          validation.error.issues,
        ),
    };
  }

  try {
    const actor =
      await getActorContext();

    if (
      !canUpdateTicketStatus(
        actor.role,
      )
    ) {
      throw new AuthorizationError(
        "Your current role cannot change ticket status.",
      );
    }

    const input = validation.data;

    const result =
      await prisma.$transaction(
        async (transaction) => {
          const ticket =
            await transaction.ticket.findFirst({
              where: {
                id: input.ticketId,
                organizationId:
                  actor.organizationId,
              },
              select: {
                id: true,
                number: true,
                type: true,
                title: true,
                requesterId: true,
                status: true,
                assigneeId: true,
                assignee: {
                  select: {
                    name: true,
                  },
                },
                approvals: {
                  where: {
                    status: "PENDING",
                  },
                  select: {
                    id: true,
                  },
                  take: 1,
                },
              },
            });

          if (!ticket) {
            throw new MutationError(
              "The selected ticket could not be found.",
            );
          }

          if (
            ticket.approvals.length > 0
          ) {
            throw new MutationError(
              "Resolve the pending approval before changing the ticket status.",
            );
          }

          if (
            ["RESOLVED", "CLOSED", "CANCELED"].includes(
              ticket.status,
            )
          ) {
            throw new MutationError(
              "Use the resolution workflow to confirm or reopen a completed ticket.",
            );
          }

          if (
            input.status ===
            "Unassigned"
          ) {
            if (
              !ticket.assigneeId
            ) {
              return {
                changed: false,
              };
            }

            await transaction.ticket.update({
              where: {
                id: ticket.id,
              },
              data: {
                status: "OPEN",
                assigneeId: null,
                resolvedAt: null,
                closedAt: null,
              },
            });

            await transaction.ticketEvent.create({
              data: {
                ticketId:
                  ticket.id,
                actorId:
                  actor.actorId,
                action:
                  "ASSIGNEE_CHANGED",
                fromValue:
                  ticket.assignee
                    ?.name ??
                  "Assigned member",
                toValue: null,
                metadata: {
                  source:
                    "operations-dashboard",
                },
              },
            });

            await createTicketNotifications(
              transaction,
              {
                organizationId:
                  actor.organizationId,
                actorId:
                  actor.actorId,
                actorName:
                  actor.actorName,
                event:
                  "STATUS_CHANGED",
                status: "OPEN",
                ticket: {
                  id: ticket.id,
                  number:
                    ticket.number,
                  type: ticket.type,
                  title: ticket.title,
                  requesterId:
                    ticket.requesterId,
                  assigneeId: null,
                },
              },
            );

            return {
              changed: true,
            };
          }

          const nextStatus =
            statusToDatabaseStatus[
              input.status
            ];

          if (
            ticket.status ===
            nextStatus
          ) {
            return {
              changed: false,
            };
          }

          await transaction.ticket.update({
            where: {
              id: ticket.id,
            },
            data: {
              status:
                nextStatus,
              resolvedAt: null,
              closedAt: null,
            },
          });

          await transaction.ticketEvent.create({
            data: {
              ticketId:
                ticket.id,
              actorId:
                actor.actorId,
              action:
                "STATUS_CHANGED",
              fromValue:
                ticket.status,
              toValue:
                nextStatus,
              metadata: {
                source:
                  "operations-dashboard",
              },
            },
          });

          await createTicketNotifications(
            transaction,
            {
              organizationId:
                actor.organizationId,
              actorId: actor.actorId,
              actorName:
                actor.actorName,
              event: "STATUS_CHANGED",
              status: nextStatus,
              ticket: {
                id: ticket.id,
                number: ticket.number,
                type: ticket.type,
                title: ticket.title,
                requesterId:
                  ticket.requesterId,
                assigneeId:
                  ticket.assigneeId,
              },
            },
          );

          return {
            changed: true,
          };
        },
        {
          isolationLevel:
            "Serializable",
        },
      );

    revalidatePath("/");

    return {
      success: true,
      message: result.changed
        ? `Ticket status changed to ${validation.data.status}.`
        : "The ticket already has that state.",
      ticketId:
        validation.data.ticketId,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function addTicketReplyAction(
  rawInput: AddTicketReplyActionInput,
): Promise<TicketActionResult> {
  const validation =
    addTicketReplyActionSchema.safeParse(
      rawInput,
    );

  if (!validation.success) {
    return {
      success: false,
      message:
        firstValidationMessage(
          validation.error.issues,
        ),
    };
  }

  try {
    const actor =
      await getActorContext();

    const input = validation.data;

    await prisma.$transaction(
      async (transaction) => {
        const ticket =
          await transaction.ticket.findFirst({
            where: {
              id: input.ticketId,
              organizationId:
                actor.organizationId,
              ...(canReplyToOrganizationTicket(
                actor.role,
              )
                ? {}
                : {
                    requesterId:
                      actor.actorId,
                  }),
            },
            select: {
              id: true,
              number: true,
              type: true,
              title: true,
              requesterId: true,
              assigneeId: true,
              firstRespondedAt: true,
            },
          });

        if (!ticket) {
          throw new MutationError(
            "The selected ticket could not be found.",
          );
        }

        const replyCreatedAt =
          new Date();

        const comment =
          await transaction.ticketComment.create({
            data: {
              ticketId: ticket.id,
              authorId:
                actor.actorId,
              body: input.body,
              visibility: "PUBLIC",
              createdAt:
                replyCreatedAt,
            },
            select: {
              id: true,
            },
          });

        const recordsFirstResponse =
          shouldRecordFirstResponse({
            actorRole: actor.role,
            actorId: actor.actorId,
            requesterId:
              ticket.requesterId,
            firstRespondedAt:
              ticket.firstRespondedAt,
          });

        const firstResponseUpdate =
          recordsFirstResponse
            ? await transaction.ticket.updateMany(
                {
                  where: {
                    id: ticket.id,
                    organizationId:
                      actor.organizationId,
                    firstRespondedAt:
                      null,
                  },
                  data: {
                    firstRespondedAt:
                      replyCreatedAt,
                  },
                },
              )
            : null;

        await transaction.ticketEvent.create({
          data: {
            ticketId: ticket.id,
            actorId:
              actor.actorId,
            action: "COMMENT_ADDED",
            toValue: "PUBLIC",
            metadata: {
              commentId:
                comment.id,
              source:
                "ticket-conversation",
              firstResponseRecorded:
                firstResponseUpdate?.count ===
                1,
            },
          },
        });

        await createTicketNotifications(
          transaction,
          {
            organizationId:
              actor.organizationId,
            actorId: actor.actorId,
            actorName: actor.actorName,
            event: "PUBLIC_REPLY",
            ticket,
          },
        );
      },
      {
        isolationLevel:
          "Serializable",
      },
    );

    revalidatePath("/");
    revalidatePath(
      `/tickets/${validation.data.ticketId}`,
    );

    return {
      success: true,
      message:
        "Reply sent successfully.",
      ticketId:
        validation.data.ticketId,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function addTicketInternalNoteAction(
  rawInput: AddTicketInternalNoteActionInput,
): Promise<TicketActionResult> {
  const validation =
    addTicketInternalNoteActionSchema.safeParse(
      rawInput,
    );

  if (!validation.success) {
    return {
      success: false,
      message:
        firstValidationMessage(
          validation.error.issues,
        ),
    };
  }

  try {
    const actor =
      await getActorContext();

    if (
      !canAddInternalTicketNotes(
        actor.role,
      )
    ) {
      throw new AuthorizationError(
        "Your current role cannot add internal notes.",
      );
    }

    const input = validation.data;

    await prisma.$transaction(
      async (transaction) => {
        const ticket =
          await transaction.ticket.findFirst({
            where: {
              id: input.ticketId,
              organizationId:
                actor.organizationId,
            },
            select: {
              id: true,
              number: true,
              type: true,
              title: true,
              requesterId: true,
              assigneeId: true,
            },
          });

        if (!ticket) {
          throw new MutationError(
            "The selected ticket could not be found.",
          );
        }

        const comment =
          await transaction.ticketComment.create({
            data: {
              ticketId: ticket.id,
              authorId:
                actor.actorId,
              body: input.body,
              visibility: "INTERNAL",
            },
            select: {
              id: true,
            },
          });

        await transaction.ticketEvent.create({
          data: {
            ticketId: ticket.id,
            actorId:
              actor.actorId,
            action: "COMMENT_ADDED",
            toValue: "INTERNAL",
            metadata: {
              commentId: comment.id,
              source: "ticket-detail",
            },
          },
        });

        await createTicketNotifications(
          transaction,
          {
            organizationId:
              actor.organizationId,
            actorId: actor.actorId,
            actorName: actor.actorName,
            event: "INTERNAL_NOTE",
            ticket,
          },
        );
      },
      {
        isolationLevel:
          "Serializable",
      },
    );

    revalidatePath("/");
    revalidatePath(
      `/tickets/${validation.data.ticketId}`,
    );

    return {
      success: true,
      message:
        "Internal note added successfully.",
      ticketId:
        validation.data.ticketId,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}
