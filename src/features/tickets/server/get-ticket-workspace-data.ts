import "server-only";

import { notFound } from "next/navigation";

import type { Prisma } from "@/generated/prisma/client";
import { getAuthorizedWorkspace } from "@/features/auth/server/authorization";
import { getTicketWorkspaceScope } from "@/features/tickets/policies/ticket-workspace-authorization";
import type {
  TicketWorkspaceData,
  TicketWorkspacePriorityFilter,
  TicketWorkspaceQuery,
  TicketWorkspaceRecord,
  TicketWorkspaceStatusFilter,
  TicketWorkspaceView,
} from "@/features/tickets/types/ticket-workspace";
import { getTicketSlaSnapshot } from "@/features/tickets/utils/ticket-sla";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

const terminalStatuses = [
  "RESOLVED",
  "CLOSED",
  "CANCELED",
] as const;

type GetTicketWorkspaceDataInput = {
  view: TicketWorkspaceView;
  query: TicketWorkspaceQuery;
};

function getSearchTicketNumber(
  query: string,
) {
  const match = query.match(
    /^(?:INC|REQ)?-?(\d+)$/i,
  );

  if (!match?.[1]) {
    return null;
  }

  const ticketNumber =
    Number.parseInt(match[1], 10);

  return Number.isSafeInteger(
    ticketNumber,
  )
    ? ticketNumber
    : null;
}

function createSearchFilter(
  query: string,
): Prisma.TicketWhereInput | null {
  if (!query) {
    return null;
  }

  const ticketNumber =
    getSearchTicketNumber(query);

  return {
    OR: [
      {
        title: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        category: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        requester: {
          is: {
            OR: [
              {
                name: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            ],
          },
        },
      },
      {
        assignee: {
          is: {
            OR: [
              {
                name: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            ],
          },
        },
      },
      ...(ticketNumber === null
        ? []
        : [
            {
              number: ticketNumber,
            },
          ]),
    ],
  };
}

function formatPriority(
  priority: Exclude<
    TicketWorkspacePriorityFilter,
    "ALL"
  >,
) {
  return `${priority
    .charAt(0)
    .toUpperCase()}${priority
    .slice(1)
    .toLowerCase()}`;
}

function formatStatus(
  status: Exclude<
    TicketWorkspaceStatusFilter,
    "ALL"
  >,
  hasAssignee: boolean,
) {
  if (
    status === "OPEN" &&
    !hasAssignee
  ) {
    return "Unassigned";
  }

  const normalized = status
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

function createFilteredWhere(
  baseScope: Prisma.TicketWhereInput,
  query: TicketWorkspaceQuery,
): Prisma.TicketWhereInput {
  const searchFilter =
    createSearchFilter(query.query);

  return {
    ...baseScope,
    ...(query.status === "ALL"
      ? {}
      : {
          status: query.status,
        }),
    ...(query.priority === "ALL"
      ? {}
      : {
          priority: query.priority,
        }),
    ...(searchFilter ?? {}),
  };
}

export async function getTicketWorkspaceData({
  view,
  query,
}: GetTicketWorkspaceDataInput): Promise<TicketWorkspaceData> {
  const workspace =
    await getAuthorizedWorkspace();

  const role = workspace.membership.role;
  const organization =
    workspace.organization;
  const now = new Date();

  const workspaceScope =
    getTicketWorkspaceScope({
      view,
      organizationId: organization.id,
      userId: workspace.user.id,
      role,
    });

  if (!workspaceScope) {
    notFound();
  }

  const baseScope: Prisma.TicketWhereInput =
    workspaceScope;

  const filteredWhere =
    createFilteredWhere(
      baseScope,
      query,
    );

  const activeScope: Prisma.TicketWhereInput = {
    ...baseScope,
    status: {
      notIn: [...terminalStatuses],
    },
  };

  const [
    totalTickets,
    openTickets,
    urgentTickets,
    overdueTickets,
    filteredTicketCount,
  ] = await prisma.$transaction([
    prisma.ticket.count({
      where: baseScope,
    }),
    prisma.ticket.count({
      where: activeScope,
    }),
    prisma.ticket.count({
      where: {
        ...activeScope,
        priority: "URGENT",
      },
    }),
    prisma.ticket.count({
      where: {
        ...activeScope,
        resolutionDueAt: {
          lt: now,
        },
      },
    }),
    prisma.ticket.count({
      where: filteredWhere,
    }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredTicketCount / PAGE_SIZE,
    ),
  );

  const page = Math.min(
    query.page,
    totalPages,
  );

  const tickets =
    await prisma.ticket.findMany({
      where: filteredWhere,
      orderBy: [
        {
          priority: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        number: true,
        type: true,
        title: true,
        category: true,
        priority: true,
        status: true,
        assigneeId: true,
        createdAt: true,
        firstResponseDueAt: true,
        firstRespondedAt: true,
        resolutionDueAt: true,
        resolvedAt: true,
        closedAt: true,
        updatedAt: true,
        requester: {
          select: {
            name: true,
            memberships: {
              where: {
                organizationId:
                  organization.id,
              },
              take: 1,
              select: {
                department: true,
              },
            },
          },
        },
        assignee: {
          select: {
            name: true,
          },
        },
      },
    });

  const records: TicketWorkspaceRecord[] =
    tickets.map((ticket) => {
      const sla =
        getTicketSlaSnapshot({
          status: ticket.status,
          createdAt: ticket.createdAt,
          firstResponseDueAt:
            ticket.firstResponseDueAt,
          firstRespondedAt:
            ticket.firstRespondedAt,
          resolutionDueAt:
            ticket.resolutionDueAt,
          resolvedAt:
            ticket.resolvedAt,
          closedAt: ticket.closedAt,
          now,
        });

      return {
        databaseId: ticket.id,
        reference: `${
          ticket.type === "INCIDENT"
            ? "INC"
            : "REQ"
        }-${ticket.number}`,
        title: ticket.title,
        category: ticket.category,
        priority: ticket.priority,
        priorityLabel: formatPriority(
          ticket.priority,
        ),
        status: ticket.status,
        statusLabel: formatStatus(
          ticket.status,
          Boolean(ticket.assigneeId),
        ),
        requesterName:
          ticket.requester.name,
        requesterDepartment:
          ticket.requester
            .memberships[0]
            ?.department ??
          "No department",
        assigneeName:
          ticket.assignee?.name ??
          "Unassigned",
        slaStatus:
          sla.statusLabel,
        slaTiming:
          sla.timingLabel,
        slaPhase: sla.phaseLabel,
        slaState: sla.tone,
        updatedAt: formatDateTime(
          ticket.updatedAt,
          organization.timezone,
        ),
      };
    });

  const isEmployee =
    role === "EMPLOYEE";

  const firstItem =
    filteredTicketCount === 0
      ? 0
      : (page - 1) * PAGE_SIZE + 1;

  const lastItem =
    filteredTicketCount === 0
      ? 0
      : Math.min(
          page * PAGE_SIZE,
          filteredTicketCount,
        );

  return {
    organizationName:
      organization.name,
    title:
      view === "all"
        ? "All tickets"
        : isEmployee
          ? "My requests"
          : "My queue",
    description:
      view === "all"
        ? "Review every service request and incident in the active workspace."
        : isEmployee
          ? "Track the requests submitted by your account and open their full conversation."
          : "Focus on the active work currently assigned to your account.",
    view,
    query: {
      ...query,
      page,
    },
    records,
    metrics: [
      {
        label: "Total tickets",
        value: totalTickets,
        description:
          view === "all"
            ? "Visible in this workspace"
            : isEmployee
              ? "Requests submitted"
              : "Assigned to you",
      },
      {
        label: "Open work",
        value: openTickets,
        description:
          "Excludes resolved and closed tickets",
      },
      {
        label: "Urgent",
        value: urgentTickets,
        description:
          "Open urgent-priority tickets",
      },
      {
        label: "Overdue",
        value: overdueTickets,
        description:
          "Open tickets past resolution target",
      },
    ],
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      totalItems: filteredTicketCount,
      totalPages,
      firstItem,
      lastItem,
    },
  };
}
