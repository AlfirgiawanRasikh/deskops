"use server";

import { revalidatePath } from "next/cache";

import {
  addTicketReplyActionSchema,
  createTicketActionSchema,
  type AddTicketReplyActionInput,
  type CreateTicketActionInput,
  type UpdateTicketStatusActionInput,
  updateTicketStatusActionSchema,
} from "@/features/tickets/schemas/ticket-actions";
import type { TicketActionResult } from "@/features/tickets/types/ticket-actions";
import { prisma } from "@/lib/prisma";

const ORGANIZATION_SLUG = "nusantara-systems";
const CURRENT_USER_EMAIL = "alfirgiawan@deskops.local";
const MAX_TRANSACTION_ATTEMPTS = 3;

const allowedMutationRoles = new Set([
  "OWNER",
  "ADMIN",
  "MANAGER",
  "TECHNICIAN",
]);

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
  "Waiting approval": "WAITING_APPROVAL",
  Scheduled: "SCHEDULED",
  Resolved: "RESOLVED",
} as const;

const serviceLevelTargets = {
  Urgent: {
    firstResponseMinutes: 15,
    resolutionMinutes: 30,
  },
  High: {
    firstResponseMinutes: 30,
    resolutionMinutes: 240,
  },
  Normal: {
    firstResponseMinutes: 120,
    resolutionMinutes: 480,
  },
  Low: {
    firstResponseMinutes: 240,
    resolutionMinutes: 2880,
  },
} satisfies Record<
  CreateTicketActionInput["priority"],
  {
    firstResponseMinutes: number;
    resolutionMinutes: number;
  }
>;

class MutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MutationError";
  }
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function firstValidationMessage(
  issues: Array<{
    message: string;
  }>,
) {
  return issues[0]?.message ?? "The submitted data is invalid.";
}

function isPrismaErrorWithCode(error: unknown, codes: string[]) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  const code = String(error.code);

  return codes.includes(code);
}

function mutationFailure(error: unknown): TicketActionResult {
  if (error instanceof MutationError) {
    return {
      success: false,
      message: error.message,
    };
  }

  console.error("DeskOps ticket mutation failed:", error);

  return {
    success: false,
    message:
      "DeskOps could not complete this operation. Please try again.",
  };
}

async function getActorContext() {
  const membership = await prisma.membership.findFirst({
    where: {
      status: "ACTIVE",
      organization: {
        slug: ORGANIZATION_SLUG,
      },
      user: {
        email: CURRENT_USER_EMAIL,
      },
    },
    select: {
      organizationId: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!membership) {
    throw new MutationError(
      "The active DeskOps member could not be found.",
    );
  }

  if (!allowedMutationRoles.has(membership.role)) {
    throw new MutationError(
      "Your current role cannot manage tickets.",
    );
  }

  return {
    organizationId: membership.organizationId,
    actorId: membership.user.id,
    actorName: membership.user.name,
  };
}

async function createTicketWithRetry({
  input,
  organizationId,
  actorId,
  requesterId,
  assetId,
}: {
  input: CreateTicketActionInput;
  organizationId: string;
  actorId: string;
  requesterId: string;
  assetId: string | null;
}) {
  for (
    let attempt = 1;
    attempt <= MAX_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
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
            (latestTicketNumber._max.number ?? 0) + 1;
          const now = new Date();
          const target =
            serviceLevelTargets[input.priority];

          const ticket = await transaction.ticket.create({
            data: {
              organizationId,
              number,
              type: requestTypeToDatabaseType[input.requestType],
              title: input.title,
              description: input.description,
              priority:
                priorityToDatabasePriority[input.priority],
              status: "OPEN",
              source: "MANUAL",
              category: input.category,
              requesterId,
              assetId,
              firstResponseDueAt: addMinutes(
                now,
                target.firstResponseMinutes,
              ),
              resolutionDueAt: addMinutes(
                now,
                target.resolutionMinutes,
              ),
            },
            select: {
              id: true,
              number: true,
              type: true,
            },
          });

          const ticketDisplayId = `${
            ticket.type === "INCIDENT" ? "INC" : "REQ"
          }-${ticket.number}`;

          await transaction.ticketEvent.create({
            data: {
              ticketId: ticket.id,
              actorId,
              action: "TICKET_CREATED",
              toValue: ticketDisplayId,
              metadata: {
                source: "operations-dashboard",
                requestType: input.requestType,
                priority: input.priority,
              },
            },
          });

          return {
            id: ticket.id,
            displayId: ticketDisplayId,
          };
        },
        {
          isolationLevel: "Serializable",
        },
      );
    } catch (error) {
      const retryable = isPrismaErrorWithCode(error, [
        "P2002",
        "P2034",
      ]);

      if (
        retryable &&
        attempt < MAX_TRANSACTION_ATTEMPTS
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
    createTicketActionSchema.safeParse(rawInput);

  if (!validation.success) {
    return {
      success: false,
      message: firstValidationMessage(
        validation.error.issues,
      ),
    };
  }

  try {
    const actor = await getActorContext();
    const input = validation.data;

    const requesterMembership =
      await prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: actor.organizationId,
            userId: input.requesterId,
          },
        },
        select: {
          userId: true,
          status: true,
        },
      });

    if (
      !requesterMembership ||
      requesterMembership.status !== "ACTIVE"
    ) {
      throw new MutationError(
        "The selected requester is not an active organization member.",
      );
    }

    let assetId: string | null = null;

    if (input.assetId) {
      const asset = await prisma.asset.findFirst({
        where: {
          id: input.assetId,
          organizationId: actor.organizationId,
          status: {
            notIn: ["RETIRED", "LOST"],
          },
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

    const ticket = await createTicketWithRetry({
      input,
      organizationId: actor.organizationId,
      actorId: actor.actorId,
      requesterId: requesterMembership.userId,
      assetId,
    });

    revalidatePath("/");

    return {
      success: true,
      message: `${ticket.displayId} was created successfully.`,
      ticketId: ticket.id,
      ticketDisplayId: ticket.displayId,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function updateTicketStatusAction(
  rawInput: UpdateTicketStatusActionInput,
): Promise<TicketActionResult> {
  const validation =
    updateTicketStatusActionSchema.safeParse(rawInput);

  if (!validation.success) {
    return {
      success: false,
      message: firstValidationMessage(
        validation.error.issues,
      ),
    };
  }

  try {
    const actor = await getActorContext();
    const input = validation.data;

    const result = await prisma.$transaction(
      async (transaction) => {
        const ticket = await transaction.ticket.findFirst({
          where: {
            id: input.ticketId,
            organizationId: actor.organizationId,
          },
          select: {
            id: true,
            status: true,
            assigneeId: true,
            assignee: {
              select: {
                name: true,
              },
            },
          },
        });

        if (!ticket) {
          throw new MutationError(
            "The selected ticket could not be found.",
          );
        }

        if (input.status === "Unassigned") {
          if (!ticket.assigneeId) {
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
              ticketId: ticket.id,
              actorId: actor.actorId,
              action: "ASSIGNEE_CHANGED",
              fromValue:
                ticket.assignee?.name ?? "Assigned member",
              toValue: null,
              metadata: {
                source: "operations-dashboard",
              },
            },
          });

          return {
            changed: true,
          };
        }

        const nextStatus =
          statusToDatabaseStatus[input.status];

        if (ticket.status === nextStatus) {
          return {
            changed: false,
          };
        }

        const resolvedAt =
          nextStatus === "RESOLVED" ? new Date() : null;

        await transaction.ticket.update({
          where: {
            id: ticket.id,
          },
          data: {
            status: nextStatus,
            resolvedAt,
            closedAt: null,
          },
        });

        await transaction.ticketEvent.create({
          data: {
            ticketId: ticket.id,
            actorId: actor.actorId,
            action: "STATUS_CHANGED",
            fromValue: ticket.status,
            toValue: nextStatus,
            metadata: {
              source: "operations-dashboard",
            },
          },
        });

        return {
          changed: true,
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    revalidatePath("/");

    return {
      success: true,
      message: result.changed
        ? `Ticket status changed to ${input.status}.`
        : "The ticket already has that state.",
      ticketId: input.ticketId,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function addTicketReplyAction(
  rawInput: AddTicketReplyActionInput,
): Promise<TicketActionResult> {
  const validation =
    addTicketReplyActionSchema.safeParse(rawInput);

  if (!validation.success) {
    return {
      success: false,
      message: firstValidationMessage(
        validation.error.issues,
      ),
    };
  }

  try {
    const actor = await getActorContext();
    const input = validation.data;

    await prisma.$transaction(
      async (transaction) => {
        const ticket = await transaction.ticket.findFirst({
          where: {
            id: input.ticketId,
            organizationId: actor.organizationId,
          },
          select: {
            id: true,
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
              authorId: actor.actorId,
              body: input.body,
              visibility: "PUBLIC",
            },
            select: {
              id: true,
            },
          });

        await transaction.ticketEvent.create({
          data: {
            ticketId: ticket.id,
            actorId: actor.actorId,
            action: "COMMENT_ADDED",
            toValue: "PUBLIC",
            metadata: {
              commentId: comment.id,
              source: "operations-dashboard",
            },
          },
        });
      },
      {
        isolationLevel: "Serializable",
      },
    );

    revalidatePath("/");

    return {
      success: true,
      message: "Reply sent successfully.",
      ticketId: input.ticketId,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}