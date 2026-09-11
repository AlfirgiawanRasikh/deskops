import type { Prisma } from "@/generated/prisma/client";
import { getResolutionNotificationRecipients } from "@/features/resolutions/policies/ticket-resolution-authorization";

type ResolutionNotificationEvent =
  | "RESOLVED"
  | "CONFIRMED"
  | "REOPENED";

type ResolutionTicketSnapshot = {
  id: string;
  number: number;
  type: "INCIDENT" | "SERVICE_REQUEST";
  title: string;
  requesterId: string;
  assigneeId: string | null;
};

const notificationTypeByEvent = {
  RESOLVED: "TICKET_RESOLVED",
  CONFIRMED: "TICKET_RESOLUTION_CONFIRMED",
  REOPENED: "TICKET_REOPENED",
} as const;

function ticketReference(ticket: ResolutionTicketSnapshot) {
  return `${ticket.type === "INCIDENT" ? "INC" : "REQ"}-${ticket.number}`;
}

function limitBody(body: string) {
  return body.length <= 255 ? body : `${body.slice(0, 252)}...`;
}

function notificationCopy({
  event,
  actorName,
  ticket,
}: {
  event: ResolutionNotificationEvent;
  actorName: string;
  ticket: ResolutionTicketSnapshot;
}) {
  const reference = ticketReference(ticket);

  switch (event) {
    case "RESOLVED":
      return {
        title: "Ticket ready for confirmation",
        body: `${actorName} resolved ${reference}: ${ticket.title}. Review the resolution and confirm or reopen it.`,
      };
    case "CONFIRMED":
      return {
        title: "Resolution confirmed",
        body: `${actorName} confirmed the resolution for ${reference}: ${ticket.title}.`,
      };
    case "REOPENED":
      return {
        title: "Ticket reopened",
        body: `${actorName} reopened ${reference}: ${ticket.title}.`,
      };
  }
}

export async function createResolutionNotifications(
  transaction: Prisma.TransactionClient,
  input: {
    organizationId: string;
    actorId: string;
    actorName: string;
    resolvedById: string;
    event: ResolutionNotificationEvent;
    ticket: ResolutionTicketSnapshot;
  },
) {
  const recipientIds = getResolutionNotificationRecipients({
    event: input.event,
    actorId: input.actorId,
    requesterId: input.ticket.requesterId,
    assigneeId: input.ticket.assigneeId,
    resolvedById: input.resolvedById,
  });

  if (recipientIds.length === 0) {
    return;
  }

  const copy = notificationCopy(input);

  await transaction.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      organizationId: input.organizationId,
      recipientId,
      actorId: input.actorId,
      ticketId: input.ticket.id,
      type: notificationTypeByEvent[input.event],
      title: copy.title,
      body: limitBody(copy.body),
    })),
  });
}
