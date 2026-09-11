import type { Prisma } from "@/generated/prisma/client";
import { getApprovalDecisionRecipients } from "@/features/approvals/policies/request-approval-authorization";

type ApprovalTicketSnapshot = {
  id: string;
  number: number;
  type: "INCIDENT" | "SERVICE_REQUEST";
  title: string;
  requesterId: string;
  assigneeId: string | null;
};

function getTicketDisplayId(
  ticket: ApprovalTicketSnapshot,
) {
  return `${
    ticket.type === "INCIDENT"
      ? "INC"
      : "REQ"
  }-${ticket.number}`;
}

function limitBody(body: string) {
  return body.length <= 255
    ? body
    : `${body.slice(0, 252)}...`;
}

export async function createApprovalRequestNotification(
  transaction: Prisma.TransactionClient,
  input: {
    organizationId: string;
    actorId: string;
    actorName: string;
    approverId: string;
    ticket: ApprovalTicketSnapshot;
  },
) {
  const displayId = getTicketDisplayId(
    input.ticket,
  );

  await transaction.notification.create({
    data: {
      organizationId: input.organizationId,
      recipientId: input.approverId,
      actorId: input.actorId,
      ticketId: input.ticket.id,
      type: "TICKET_APPROVAL_REQUESTED",
      title: "Approval requested",
      body: limitBody(
        `${input.actorName} requested your approval for ${displayId}: ${input.ticket.title}`,
      ),
    },
  });
}

export async function createApprovalDecisionNotifications(
  transaction: Prisma.TransactionClient,
  input: {
    organizationId: string;
    actorId: string;
    actorName: string;
    requestedById: string;
    decision: "APPROVED" | "REJECTED";
    ticket: ApprovalTicketSnapshot;
  },
) {
  const recipientIds =
    getApprovalDecisionRecipients({
      actorId: input.actorId,
      ticketRequesterId:
        input.ticket.requesterId,
      ticketAssigneeId:
        input.ticket.assigneeId,
      requestedById: input.requestedById,
    });

  if (recipientIds.length === 0) {
    return;
  }

  const displayId = getTicketDisplayId(
    input.ticket,
  );
  const approved =
    input.decision === "APPROVED";

  await transaction.notification.createMany({
    data: recipientIds.map(
      (recipientId) => ({
        organizationId:
          input.organizationId,
        recipientId,
        actorId: input.actorId,
        ticketId: input.ticket.id,
        type: "TICKET_APPROVAL_DECIDED" as const,
        title: approved
          ? "Service request approved"
          : "Service request rejected",
        body: limitBody(
          `${input.actorName} ${
            approved
              ? "approved"
              : "rejected"
          } ${displayId}: ${input.ticket.title}`,
        ),
      }),
    ),
  });
}
