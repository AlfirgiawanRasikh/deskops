"use server";

import { revalidatePath } from "next/cache";

import {
  canDecideTicketApproval,
  canRequestTicketApproval,
  canSelectTicketApprover,
} from "@/features/approvals/policies/request-approval-authorization";
import {
  decideTicketApprovalActionSchema,
  type DecideTicketApprovalActionInput,
  requestTicketApprovalActionSchema,
  type RequestTicketApprovalActionInput,
} from "@/features/approvals/schemas/request-approval-actions";
import {
  createApprovalDecisionNotifications,
  createApprovalRequestNotification,
} from "@/features/approvals/server/approval-notifications";
import {
  AuthorizationError,
  getAuthorizedWorkspace,
} from "@/features/auth/server/authorization";
import type { TicketActionResult } from "@/features/tickets/types/ticket-actions";
import { prisma } from "@/lib/prisma";

class ApprovalMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalMutationError";
  }
}

function firstValidationMessage(
  issues: Array<{ message: string }>,
) {
  return (
    issues[0]?.message ??
    "The submitted approval data is invalid."
  );
}

function isPrismaErrorWithCode(
  error: unknown,
  codes: string[],
) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      codes.includes(String(error.code)),
  );
}

function failure(
  error: unknown,
): TicketActionResult {
  if (
    error instanceof ApprovalMutationError ||
    error instanceof AuthorizationError
  ) {
    return {
      success: false,
      message: error.message,
    };
  }

  if (
    isPrismaErrorWithCode(error, ["P2002"])
  ) {
    return {
      success: false,
      message:
        "This ticket already has a pending approval. Refresh the page to see it.",
    };
  }

  if (
    isPrismaErrorWithCode(error, ["P2034"])
  ) {
    return {
      success: false,
      message:
        "The approval state changed while this action was being saved. Refresh the page and try again.",
    };
  }

  console.error(
    "DeskOps approval mutation failed:",
    error,
  );

  return {
    success: false,
    message:
      "DeskOps could not complete this approval action. Please try again.",
  };
}

function revalidateTicket(ticketId: string) {
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidatePath("/tickets/my-queue");
  revalidatePath(`/tickets/${ticketId}`);
}

export async function requestTicketApprovalAction(
  rawInput: RequestTicketApprovalActionInput,
): Promise<TicketActionResult> {
  const validation =
    requestTicketApprovalActionSchema.safeParse(
      rawInput,
    );

  if (!validation.success) {
    return {
      success: false,
      message: firstValidationMessage(
        validation.error.issues,
      ),
    };
  }

  try {
    const workspace =
      await getAuthorizedWorkspace();
    const input = validation.data;

    const result = await prisma.$transaction(
      async (transaction) => {
        const ticket =
          await transaction.ticket.findFirst({
            where: {
              id: input.ticketId,
              organizationId:
                workspace.organization.id,
            },
            select: {
              id: true,
              number: true,
              type: true,
              title: true,
              requesterId: true,
              assigneeId: true,
              status: true,
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
          throw new ApprovalMutationError(
            "The selected ticket could not be found.",
          );
        }

        if (ticket.type !== "SERVICE_REQUEST") {
          throw new ApprovalMutationError(
            "Approval is available only for service requests.",
          );
        }

        if (
          [
            "RESOLVED",
            "CLOSED",
            "CANCELED",
          ].includes(ticket.status)
        ) {
          throw new ApprovalMutationError(
            "A completed ticket cannot be submitted for approval.",
          );
        }

        if (
          !canRequestTicketApproval({
            role: workspace.membership.role,
            actorId: workspace.user.id,
            assigneeId: ticket.assigneeId,
          })
        ) {
          throw new AuthorizationError(
            workspace.membership.role ===
              "TECHNICIAN"
              ? "Technicians can request approval only for tickets assigned to them."
              : "Your current role cannot request ticket approval.",
          );
        }

        if (
          ticket.approvals.length > 0 ||
          ticket.status === "WAITING_APPROVAL"
        ) {
          throw new ApprovalMutationError(
            "This ticket already has a pending approval.",
          );
        }

        const approverMembership =
          await transaction.membership.findFirst({
            where: {
              organizationId:
                workspace.organization.id,
              userId: input.approverId,
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
          !approverMembership ||
          !canSelectTicketApprover({
            actorId: workspace.user.id,
            ticketRequesterId:
              ticket.requesterId,
            candidateId:
              approverMembership.user.id,
            role: approverMembership.role,
            status:
              approverMembership.status,
          })
        ) {
          if (
            input.approverId ===
            workspace.user.id
          ) {
            throw new ApprovalMutationError(
              "You cannot approve your own request.",
            );
          }

          if (
            input.approverId ===
            ticket.requesterId
          ) {
            throw new ApprovalMutationError(
              "The ticket requester cannot be selected as the approver.",
            );
          }

          throw new ApprovalMutationError(
            "Select an active Owner, Admin, or Manager as approver.",
          );
        }

        const approval =
          await transaction.ticketApproval.create({
            data: {
              ticketId: ticket.id,
              requestedById:
                workspace.user.id,
              approverId:
                approverMembership.user.id,
              requestNote:
                input.note ?? null,
            },
            select: {
              id: true,
            },
          });

        await transaction.ticket.update({
          where: {
            id: ticket.id,
          },
          data: {
            status: "WAITING_APPROVAL",
            resolvedAt: null,
            closedAt: null,
          },
        });

        await transaction.ticketEvent.create({
          data: {
            ticketId: ticket.id,
            actorId: workspace.user.id,
            action: "APPROVAL_REQUESTED",
            fromValue: ticket.status,
            toValue:
              approverMembership.user.name,
            metadata: {
              source: "ticket-detail",
              approvalId: approval.id,
              nextTicketStatus:
                "WAITING_APPROVAL",
            },
          },
        });

        await createApprovalRequestNotification(
          transaction,
          {
            organizationId:
              workspace.organization.id,
            actorId: workspace.user.id,
            actorName: workspace.user.name,
            approverId:
              approverMembership.user.id,
            ticket,
          },
        );

        return ticket.id;
      },
      {
        isolationLevel: "Serializable",
      },
    );

    revalidateTicket(result);

    return {
      success: true,
      message:
        "Approval request sent and the ticket is now waiting for approval.",
      ticketId: result,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function decideTicketApprovalAction(
  rawInput: DecideTicketApprovalActionInput,
): Promise<TicketActionResult> {
  const validation =
    decideTicketApprovalActionSchema.safeParse(
      rawInput,
    );

  if (!validation.success) {
    return {
      success: false,
      message: firstValidationMessage(
        validation.error.issues,
      ),
    };
  }

  try {
    const workspace =
      await getAuthorizedWorkspace();
    const input = validation.data;

    const result = await prisma.$transaction(
      async (transaction) => {
        const approval =
          await transaction.ticketApproval.findFirst({
            where: {
              id: input.approvalId,
              ticket: {
                organizationId:
                  workspace.organization.id,
              },
            },
            select: {
              id: true,
              status: true,
              requestedById: true,
              approverId: true,
              ticket: {
                select: {
                  id: true,
                  number: true,
                  type: true,
                  title: true,
                  requesterId: true,
                  assigneeId: true,
                  status: true,
                },
              },
            },
          });

        if (!approval) {
          throw new ApprovalMutationError(
            "The selected approval request could not be found.",
          );
        }

        if (
          !canDecideTicketApproval({
            role: workspace.membership.role,
            actorId: workspace.user.id,
            approverId: approval.approverId,
            status: approval.status,
          })
        ) {
          throw new AuthorizationError(
            approval.status !== "PENDING"
              ? "This approval request has already been decided."
              : "Only the assigned approver can decide this request.",
          );
        }

        if (
          approval.ticket.status !==
          "WAITING_APPROVAL"
        ) {
          throw new ApprovalMutationError(
            "The ticket is no longer waiting for this approval.",
          );
        }

        const decidedAt = new Date();
        const nextTicketStatus =
          input.decision === "APPROVED"
            ? "IN_PROGRESS"
            : "CANCELED";

        const updated =
          await transaction.ticketApproval.updateMany({
            where: {
              id: approval.id,
              status: "PENDING",
            },
            data: {
              status: input.decision,
              decisionNote:
                input.note ?? null,
              decidedAt,
            },
          });

        if (updated.count !== 1) {
          throw new ApprovalMutationError(
            "This approval request has already been decided.",
          );
        }

        await transaction.ticket.update({
          where: {
            id: approval.ticket.id,
          },
          data: {
            status: nextTicketStatus,
            resolvedAt: null,
            closedAt:
              input.decision === "REJECTED"
                ? decidedAt
                : null,
          },
        });

        await transaction.ticketEvent.create({
          data: {
            ticketId: approval.ticket.id,
            actorId: workspace.user.id,
            action: "APPROVAL_DECIDED",
            fromValue: "PENDING",
            toValue: input.decision,
            metadata: {
              source: "ticket-detail",
              approvalId: approval.id,
              previousTicketStatus:
                approval.ticket.status,
              nextTicketStatus,
            },
          },
        });

        await createApprovalDecisionNotifications(
          transaction,
          {
            organizationId:
              workspace.organization.id,
            actorId: workspace.user.id,
            actorName: workspace.user.name,
            requestedById:
              approval.requestedById,
            decision: input.decision,
            ticket: approval.ticket,
          },
        );

        return approval.ticket.id;
      },
      {
        isolationLevel: "Serializable",
      },
    );

    revalidateTicket(result);

    return {
      success: true,
      message:
        input.decision === "APPROVED"
          ? "Service request approved. The ticket is now in progress."
          : "Service request rejected and canceled.",
      ticketId: result,
    };
  } catch (error) {
    return failure(error);
  }
}
