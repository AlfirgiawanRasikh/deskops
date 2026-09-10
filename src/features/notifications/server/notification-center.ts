import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getAuthorizedWorkspace } from "@/features/auth/server/authorization";
import {
  canReceiveNewTicketNotification,
  getNotificationReadScope,
  getTicketNotificationRecipients,
  newTicketNotificationRoles,
  type TicketNotificationEvent,
} from "@/features/notifications/policies/notification-authorization";
import type {
  NotificationActionInput,
} from "@/features/notifications/schemas/notification-actions";
import type {
  NotificationCenterResponse,
  NotificationKind,
} from "@/features/notifications/types/notification-center";
import { prisma } from "@/lib/prisma";

type TicketNotificationSnapshot = {
  id: string;
  number: number;
  type: "INCIDENT" | "SERVICE_REQUEST";
  title: string;
  requesterId: string;
  assigneeId: string | null;
};

type CreateTicketNotificationsInput = {
  organizationId: string;
  actorId: string;
  actorName: string;
  event: TicketNotificationEvent;
  ticket: TicketNotificationSnapshot;
  status?: string;
};

type CreateNewTicketNotificationsInput = {
  organizationId: string;
  actorId: string;
  actorName: string;
  ticket: TicketNotificationSnapshot;
};

const notificationKindByEvent = {
  ASSIGNED: "TICKET_ASSIGNED",
  STATUS_CHANGED: "TICKET_STATUS_CHANGED",
  PUBLIC_REPLY: "TICKET_REPLY_ADDED",
  INTERNAL_NOTE:
    "TICKET_INTERNAL_NOTE_ADDED",
} as const satisfies Record<
  TicketNotificationEvent,
  NotificationKind
>;

const READ_NOTIFICATION_RETENTION_DAYS =
  90;

const READ_NOTIFICATION_RETENTION_MS =
  READ_NOTIFICATION_RETENTION_DAYS *
  24 *
  60 *
  60 *
  1000;

function formatEnumValue(value: string) {
  const normalized = value
    .toLowerCase()
    .replaceAll("_", " ");

  return `${normalized
    .charAt(0)
    .toUpperCase()}${normalized.slice(1)}`;
}

function getTicketDisplayId(
  ticket: TicketNotificationSnapshot,
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

function getNotificationCopy({
  actorName,
  event,
  ticket,
  status,
}: Pick<
  CreateTicketNotificationsInput,
  "actorName" | "event" | "ticket" | "status"
>) {
  const displayId =
    getTicketDisplayId(ticket);

  switch (event) {
    case "ASSIGNED":
      return {
        title: "Ticket assigned to you",
        body: `${actorName} assigned ${displayId}: ${ticket.title}`,
      };

    case "STATUS_CHANGED":
      return {
        title: "Ticket status updated",
        body: `${actorName} changed ${displayId} to ${
          status
            ? formatEnumValue(status)
            : "a new status"
        }.`,
      };

    case "PUBLIC_REPLY":
      return {
        title: "New ticket reply",
        body: `${actorName} replied to ${displayId}: ${ticket.title}`,
      };

    case "INTERNAL_NOTE":
      return {
        title: "New internal note",
        body: `${actorName} added an internal note to ${displayId}: ${ticket.title}`,
      };
  }
}

export async function createTicketNotifications(
  transaction: Prisma.TransactionClient,
  input: CreateTicketNotificationsInput,
) {
  const recipientIds =
    getTicketNotificationRecipients({
      event: input.event,
      actorId: input.actorId,
      requesterId:
        input.ticket.requesterId,
      assigneeId:
        input.ticket.assigneeId,
    });

  if (recipientIds.length === 0) {
    return;
  }

  const copy = getNotificationCopy(input);

  await transaction.notification.createMany({
    data: recipientIds.map(
      (recipientId) => ({
        organizationId:
          input.organizationId,
        recipientId,
        actorId: input.actorId,
        ticketId: input.ticket.id,
        type:
          notificationKindByEvent[
            input.event
          ],
        title: copy.title,
        body: limitBody(copy.body),
      }),
    ),
  });
}

export async function createNewTicketNotifications(
  transaction: Prisma.TransactionClient,
  input: CreateNewTicketNotificationsInput,
) {
  const memberships =
    await transaction.membership.findMany({
      where: {
        organizationId:
          input.organizationId,
        status: "ACTIVE",
        role: {
          in: [
            ...newTicketNotificationRoles,
          ],
        },
      },
      select: {
        role: true,
        status: true,
        userId: true,
      },
    });

  const recipientIds = memberships
    .filter((membership) =>
      canReceiveNewTicketNotification({
        ...membership,
        actorId: input.actorId,
      }),
    )
    .map((membership) =>
      membership.userId,
    );

  if (recipientIds.length === 0) {
    return;
  }

  const displayId =
    getTicketDisplayId(input.ticket);

  await transaction.notification.createMany({
    data: recipientIds.map(
      (recipientId) => ({
        organizationId:
          input.organizationId,
        recipientId,
        actorId: input.actorId,
        ticketId: input.ticket.id,
        type: "TICKET_CREATED",
        title: "New ticket submitted",
        body: limitBody(
          `${input.actorName} submitted ${displayId}: ${input.ticket.title}`,
        ),
      }),
    ),
  });
}

export async function getNotificationCenterData(): Promise<NotificationCenterResponse> {
  const workspace =
    await getAuthorizedWorkspace();

  const scope = getNotificationReadScope({
    organizationId:
      workspace.organization.id,
    userId: workspace.user.id,
  });

  await prisma.notification.deleteMany({
    where: {
      ...scope,
      readAt: {
        lt: new Date(
          Date.now() -
            READ_NOTIFICATION_RETENTION_MS,
        ),
      },
    },
  });

  const [notifications, unreadCount] =
    await Promise.all([
      prisma.notification.findMany({
        where: scope,
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          ticketId: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: {
          ...scope,
          readAt: null,
        },
      }),
    ]);

  return {
    unreadCount,
    notifications: notifications.map(
      (notification) => ({
        id: notification.id,
        kind: notification.type,
        title: notification.title,
        body: notification.body,
        href: notification.ticketId
          ? `/tickets/${notification.ticketId}`
          : null,
        createdAt:
          notification.createdAt.toISOString(),
        isRead:
          notification.readAt !== null,
      }),
    ),
  };
}

export async function applyNotificationAction(
  input: NotificationActionInput,
) {
  const workspace =
    await getAuthorizedWorkspace();

  const scope = getNotificationReadScope({
    organizationId:
      workspace.organization.id,
    userId: workspace.user.id,
  });

  if (input.action === "read-all") {
    await prisma.notification.updateMany({
      where: {
        ...scope,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return;
  }

  if (input.action === "clear-read") {
    await prisma.notification.deleteMany({
      where: {
        ...scope,
        readAt: {
          not: null,
        },
      },
    });

    return;
  }

  await prisma.notification.updateMany({
    where: {
      ...scope,
      id: input.notificationId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}
