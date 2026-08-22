import "server-only";

import {
  canViewInternalTicketComments,
  getAuthorizedWorkspace,
  getTicketReadScope,
} from "@/features/auth/server/authorization";
import type { TicketDetailData } from "@/features/tickets/types/ticket-detail";
import { prisma } from "@/lib/prisma";

function formatEnumValue(value: string) {
  const normalized = value
    .toLowerCase()
    .replaceAll("_", " ");

  return `${normalized
    .charAt(0)
    .toUpperCase()}${normalized.slice(1)}`;
}

function formatDateTime(
  date: Date,
  timeZone: string,
) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

function formatEvent(event: {
  action: string;
  fromValue: string | null;
  toValue: string | null;
  actor: {
    name: string;
  } | null;
}) {
  const actor =
    event.actor?.name ?? "System";

  switch (event.action) {
    case "TICKET_CREATED":
      return `${actor} created this ticket.`;

    case "STATUS_CHANGED":
      return `${actor} changed the status from ${
        event.fromValue
          ? formatEnumValue(
              event.fromValue,
            )
          : "empty"
      } to ${
        event.toValue
          ? formatEnumValue(event.toValue)
          : "empty"
      }.`;

    case "ASSIGNEE_CHANGED":
      return event.toValue
        ? `${actor} assigned the ticket to ${event.toValue}.`
        : `${actor} returned the ticket to the unassigned queue.`;

    default:
      return `${actor} updated this ticket.`;
  }
}

export async function getTicketDetailData(
  ticketId: string,
): Promise<TicketDetailData | null> {
  const workspace =
    await getAuthorizedWorkspace();

  const role = workspace.membership.role;
  const organizationId =
    workspace.organization.id;

  const canReadInternalComments =
    canViewInternalTicketComments(role);

  const ticket =
    await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        ...getTicketReadScope({
          organizationId,
          userId: workspace.user.id,
          role,
        }),
      },
      select: {
        id: true,
        number: true,
        type: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        requester: {
          select: {
            name: true,
            email: true,
            memberships: {
              where: {
                organizationId,
              },
              select: {
                department: true,
              },
              take: 1,
            },
          },
        },
        assignee: {
          select: {
            name: true,
            email: true,
          },
        },
        asset: {
          select: {
            assetTag: true,
            name: true,
            model: true,
            serialNumber: true,
          },
        },
        comments: {
          ...(canReadInternalComments
            ? {}
            : {
                where: {
                  visibility: "PUBLIC",
                } as const,
              }),
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            body: true,
            visibility: true,
            createdAt: true,
            author: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        events: {
          where: {
            action: {
              not: "COMMENT_ADDED",
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
          select: {
            id: true,
            action: true,
            fromValue: true,
            toValue: true,
            createdAt: true,
            actor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

  if (!ticket) {
    return null;
  }

  const timeZone =
    workspace.organization.timezone;

  const prefix =
    ticket.type === "INCIDENT"
      ? "INC"
      : "REQ";

  return {
    databaseId: ticket.id,
    displayId: `${prefix}-${ticket.number}`,
    requestType:
      formatEnumValue(ticket.type),
    title: ticket.title,
    description: ticket.description,
    status: formatEnumValue(ticket.status),
    priority:
      formatEnumValue(ticket.priority),
    category: ticket.category,
    createdAt: formatDateTime(
      ticket.createdAt,
      timeZone,
    ),
    updatedAt: formatDateTime(
      ticket.updatedAt,
      timeZone,
    ),
    requester: {
      name: ticket.requester.name,
      email: ticket.requester.email,
      department:
        ticket.requester
          .memberships[0]
          ?.department ??
        "No department",
    },
    assignee: ticket.assignee
      ? {
          name: ticket.assignee.name,
          email: ticket.assignee.email,
        }
      : null,
    asset: ticket.asset
      ? {
          label: `${ticket.asset.assetTag} - ${
            ticket.asset.name
          }${
            ticket.asset.model
              ? ` - ${ticket.asset.model}`
              : ""
          }`,
          serialNumber:
            ticket.asset.serialNumber,
        }
      : null,
    comments: ticket.comments.map(
      (comment) => ({
        id: comment.id,
        authorName: comment.author.name,
        authorEmail:
          comment.author.email,
        body: comment.body,
        visibility: comment.visibility,
        createdAt: formatDateTime(
          comment.createdAt,
          timeZone,
        ),
      }),
    ),
    activity: ticket.events.map(
      (event) => ({
        id: event.id,
        description: formatEvent(event),
        createdAt: formatDateTime(
          event.createdAt,
          timeZone,
        ),
      }),
    ),
  };
}
