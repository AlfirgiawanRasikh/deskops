import "server-only";

import {
  canAssignTickets,
  canCreateTicketForOtherMembers,
  canViewInternalTicketComments,
  canViewOrganizationAssets,
  canViewOrganizationTickets,
  getAuthorizedWorkspace,
} from "@/features/auth/server/authorization";
import type {
  OperationsDashboardData,
  TicketPriority,
  TicketRecord,
  TicketStatus,
} from "@/features/operations/types/operations-dashboard";
import { prisma } from "@/lib/prisma";

function mapPriority(
  priority: string,
): TicketPriority {
  switch (priority) {
    case "URGENT":
      return "Urgent";

    case "HIGH":
      return "High";

    case "LOW":
      return "Low";

    default:
      return "Normal";
  }
}

function mapStatus(
  status: string,
  hasAssignee: boolean,
): TicketStatus {
  switch (status) {
    case "OPEN":
      return hasAssignee
        ? "Open"
        : "Unassigned";

    case "TRIAGED":
      return "Investigating";

    case "IN_PROGRESS":
      return "In progress";

    case "WAITING_REQUESTER":
      return "Waiting requester";

    case "WAITING_APPROVAL":
      return "Waiting approval";

    case "SCHEDULED":
      return "Scheduled";

    case "RESOLVED":
      return "Resolved";

    default:
      return "Open";
  }
}

function formatEnumValue(
  value: string | null,
) {
  if (!value) {
    return "an empty value";
  }

  return value
    .toLowerCase()
    .replaceAll("_", " ");
}

function formatRelativeTime(
  date: Date,
  now: Date,
) {
  const differenceInSeconds = Math.round(
    (date.getTime() - now.getTime()) /
      1000,
  );

  const formatter =
    new Intl.RelativeTimeFormat("en", {
      numeric: "auto",
    });

  if (
    Math.abs(differenceInSeconds) < 60
  ) {
    return formatter.format(
      differenceInSeconds,
      "second",
    );
  }

  const differenceInMinutes = Math.round(
    differenceInSeconds / 60,
  );

  if (
    Math.abs(differenceInMinutes) < 60
  ) {
    return formatter.format(
      differenceInMinutes,
      "minute",
    );
  }

  const differenceInHours = Math.round(
    differenceInMinutes / 60,
  );

  if (
    Math.abs(differenceInHours) < 24
  ) {
    return formatter.format(
      differenceInHours,
      "hour",
    );
  }

  return formatter.format(
    Math.round(
      differenceInHours / 24,
    ),
    "day",
  );
}

function formatSla(
  dueAt: Date | null,
  now: Date,
) {
  if (!dueAt) {
    return "No target";
  }

  const remainingMinutes = Math.ceil(
    (dueAt.getTime() - now.getTime()) /
      60_000,
  );

  if (remainingMinutes <= 0) {
    return "Breached";
  }

  if (remainingMinutes < 60) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes < 1440) {
    return `${Math.ceil(
      remainingMinutes / 60,
    )}h`;
  }

  return `${Math.ceil(
    remainingMinutes / 1440,
  )}d`;
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
    case "STATUS_CHANGED":
      return `${actor} changed the status from ${formatEnumValue(
        event.fromValue,
      )} to ${formatEnumValue(
        event.toValue,
      )}.`;

    case "ASSIGNEE_CHANGED":
      return event.toValue
        ? `${actor} assigned the ticket to ${event.toValue}.`
        : `${actor} returned the ticket to the unassigned queue.`;

    case "TICKET_CREATED":
      return `${actor} created this ticket.`;

    case "COMMENT_ADDED":
      return event.toValue === "INTERNAL"
        ? `${actor} added an internal note.`
        : `${actor} replied to the requester.`;

    default:
      return `${actor} updated this ticket.`;
  }
}

export async function getOperationsDashboardData(): Promise<OperationsDashboardData> {
  const workspace =
    await getAuthorizedWorkspace();

  const now = new Date();
  const organization =
    workspace.organization;
  const role =
    workspace.membership.role;
  const userId = workspace.user.id;

  const canReadAllTickets =
    canViewOrganizationTickets(role);

  const canReadAllAssets =
    canViewOrganizationAssets(role);

  const canReadInternalComments =
    canViewInternalTicketComments(role);

  const canSelectOtherRequesters =
    canCreateTicketForOtherMembers(role);

  const canAssign =
    canAssignTickets(role);

  const [
    tickets,
    assetCount,
    assignedAssetCount,
    activeMemberships,
    selectableAssets,
  ] = await prisma.$transaction([
    prisma.ticket.findMany({
      where: {
        organizationId: organization.id,
        status: {
          notIn: [
            "RESOLVED",
            "CLOSED",
            "CANCELED",
          ],
        },
        ...(canReadAllTickets
          ? {}
          : {
              requesterId: userId,
            }),
      },
      orderBy: [
        {
          priority: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        number: true,
        type: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        category: true,
        assigneeId: true,
        resolutionDueAt: true,
        createdAt: true,
        requester: {
          select: {
            name: true,
            memberships: {
              where: {
                organizationId:
                  organization.id,
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
          },
        },
        asset: {
          select: {
            assetTag: true,
            model: true,
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
            createdAt: "desc",
          },
          take: 1,
          select: {
            body: true,
            createdAt: true,
            author: {
              select: {
                name: true,
              },
            },
          },
        },
        events: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
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
    }),

    prisma.asset.count({
      where: {
        organizationId: organization.id,
        ...(canReadAllAssets
          ? {}
          : {
              assignedToId: userId,
            }),
      },
    }),

    prisma.asset.count({
      where: {
        organizationId: organization.id,
        status: "ASSIGNED",
        ...(canReadAllAssets
          ? {}
          : {
              assignedToId: userId,
            }),
      },
    }),

    prisma.membership.findMany({
      where: {
        organizationId: organization.id,
        status: "ACTIVE",
        ...(canSelectOtherRequesters
          ? {}
          : {
              userId,
            }),
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
      select: {
        department: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),

    prisma.asset.findMany({
      where: {
        organizationId: organization.id,
        status: {
          notIn: [
            "RETIRED",
            "LOST",
          ],
        },
        ...(canReadAllAssets
          ? {}
          : {
              assignedToId: userId,
            }),
      },
      orderBy: {
        assetTag: "asc",
      },
      select: {
        id: true,
        assetTag: true,
        name: true,
        model: true,
      },
    }),
  ]);

  const assignableMemberships =
    canAssign
      ? await prisma.membership.findMany({
          where: {
            organizationId:
              organization.id,
            status: "ACTIVE",
            role: "TECHNICIAN",
          },
          orderBy: {
            user: {
              name: "asc",
            },
          },
          select: {
            department: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })
      : [];

  const dashboardTickets: TicketRecord[] =
    tickets.map((ticket) => {
      const latestComment =
        ticket.comments[0];

      const latestEvent =
        ticket.events[0];

      const commentIsLatest =
        latestComment &&
        (!latestEvent ||
          latestComment.createdAt.getTime() >=
            latestEvent.createdAt.getTime());

      const activityDate =
        commentIsLatest && latestComment
          ? latestComment.createdAt
          : (latestEvent?.createdAt ??
            ticket.createdAt);

      const latestActivity =
        commentIsLatest && latestComment
          ? `${latestComment.author.name}: ${latestComment.body}`
          : latestEvent
            ? formatEvent(latestEvent)
            : "Ticket created.";

      const prefix =
        ticket.type === "INCIDENT"
          ? "INC"
          : "REQ";

      return {
        databaseId: ticket.id,
        id: `${prefix}-${ticket.number}`,
        title: ticket.title,
        requester:
          ticket.requester.name,
        department:
          ticket.requester
            .memberships[0]
            ?.department ??
          "No department",
        priority: mapPriority(
          ticket.priority,
        ),
        status: mapStatus(
          ticket.status,
          Boolean(
            ticket.assigneeId,
          ),
        ),
        assigneeId:
          ticket.assigneeId,
        assignee:
          ticket.assignee?.name ??
          "Unassigned",
        assigneeShort:
          ticket.assignee?.name
            .split(" ")[0] ?? "-",
        mine:
          ticket.assigneeId === userId,
        sla: formatSla(
          ticket.resolutionDueAt,
          now,
        ),
        summary: ticket.description,
        asset: ticket.asset
          ? `${ticket.asset.assetTag} - ${
              ticket.asset.model ??
              "Unknown model"
            }`
          : "Not linked",
        category: ticket.category,
        latestActivity,
        updatedAt:
          formatRelativeTime(
            activityDate,
            now,
          ),
      };
    });

  const serviceRequestCount =
    tickets.filter(
      (ticket) =>
        ticket.type ===
        "SERVICE_REQUEST",
    ).length;

  const unassignedCount =
    tickets.filter(
      (ticket) =>
        !ticket.assigneeId,
    ).length;

  const urgentCount =
    tickets.filter(
      (ticket) =>
        ticket.priority === "URGENT",
    ).length;

  const highPriorityCount =
    tickets.filter(
      (ticket) =>
        ticket.priority ===
          "URGENT" ||
        ticket.priority === "HIGH",
    ).length;

  const dateLabel =
    new Intl.DateTimeFormat("en", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone:
        organization.timezone,
    }).format(now);

  const timezoneParts =
    organization.timezone.split("/");

  const timeZoneLabel =
    timezoneParts[
      timezoneParts.length - 1
    ]?.replaceAll("_", " ") ??
    organization.timezone;

  return {
    organizationName:
      organization.name,
    dateLabel: `${dateLabel} - ${timeZoneLabel}`,
    tickets: dashboardTickets,

    requesterOptions:
      activeMemberships.map(
        (membership) => ({
          value: membership.user.id,
          label: `${
            membership.user.name
          } - ${
            membership.department ??
            membership.user.email
          }`,
        }),
      ),

    assetOptions:
      selectableAssets.map(
        (asset) => ({
          value: asset.id,
          label: `${asset.assetTag} - ${
            asset.name
          }${
            asset.model
              ? ` - ${asset.model}`
              : ""
          }`,
        }),
      ),

    assigneeOptions:
      assignableMemberships.map(
        (membership) => ({
          value: membership.user.id,
          label: `${
            membership.user.name
          } - ${
            membership.department ??
            membership.user.email
          }`,
        }),
      ),

    metrics: [
      {
        label: "Open requests",
        value: String(
          tickets.length,
        ),
        note: `${serviceRequestCount} service requests`,
      },
      {
        label: "Unassigned",
        value: String(
          unassignedCount,
        ),
        note:
          unassignedCount === 1
            ? "Needs queue ownership"
            : "Need queue ownership",
      },
      {
        label: "High priority",
        value: String(
          highPriorityCount,
        ),
        note: `${urgentCount} urgent`,
      },
      {
        label: canReadAllAssets
          ? "Assets tracked"
          : "Assigned assets",
        value: String(assetCount),
        note: `${assignedAssetCount} currently assigned`,
      },
    ],
  };
}
