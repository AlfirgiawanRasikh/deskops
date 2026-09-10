import "server-only";

import { notFound } from "next/navigation";

import type { Prisma } from "@/generated/prisma/client";
import { canViewAuditLog } from "@/features/audit/policies/audit-authorization";
import { getAuditLogRangeStart } from "@/features/audit/schemas/audit-log-query";
import type {
  AuditLogData,
  AuditLogQuery,
  AuditLogRecord,
} from "@/features/audit/types/audit-log";
import {
  formatAssetAuditEvent,
  formatMembershipAuditEvent,
  formatTicketAuditEvent,
  formatWorkspaceAuditEvent,
} from "@/features/audit/utils/audit-event-formatters";
import { getAuthorizedWorkspace } from "@/features/auth/server/authorization";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 20;
const MAX_EXPORT_SIZE = 5_000;

const actorSelect = {
  id: true,
  name: true,
  email: true,
} as const;

type AuditLogLoadOptions = {
  pageSize?: number;
  firstPageOnly?: boolean;
};

function createActorWhere(
  actorId: string,
) {
  if (actorId === "ALL") {
    return {};
  }

  return actorId === "SYSTEM"
    ? {
        actorId: null,
      }
    : {
        actorId,
      };
}

function normalizedActionSearch(
  query: string,
) {
  return query
    .trim()
    .replaceAll(/\s+/g, "_")
    .replaceAll("-", "_")
    .toUpperCase();
}

function actorSearch(
  query: string,
) {
  return {
    actor: {
      is: {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
          {
            email: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
        ],
      },
    },
  };
}

function actionSearch(
  query: string,
) {
  const normalized =
    normalizedActionSearch(query);

  return [
    {
      action: {
        contains: query,
        mode: "insensitive" as const,
      },
    },
    ...(normalized === query
      ? []
      : [
          {
            action: {
              contains: normalized,
              mode: "insensitive" as const,
            },
          },
        ]),
  ];
}

function parseTicketNumber(
  query: string,
) {
  const match = query.match(
    /^(?:INC|REQ)?-?(\d+)$/i,
  );

  if (!match?.[1]) {
    return null;
  }

  const value = Number.parseInt(
    match[1],
    10,
  );

  return Number.isSafeInteger(value)
    ? value
    : null;
}

function createTicketEventWhere({
  organizationId,
  rangeStart,
  query,
}: {
  organizationId: string;
  rangeStart: Date;
  query: AuditLogQuery;
}): Prisma.TicketEventWhereInput {
  const ticketNumber =
    parseTicketNumber(query.query);

  return {
    ticket: {
      organizationId,
    },
    createdAt: {
      gte: rangeStart,
    },
    ...createActorWhere(
      query.actorId,
    ),
    ...(query.query
      ? {
          OR: [
            ...actionSearch(
              query.query,
            ),
            actorSearch(query.query),
            {
              ticket: {
                is: {
                  OR: [
                    {
                      title: {
                        contains:
                          query.query,
                        mode: "insensitive",
                      },
                    },
                    {
                      category: {
                        contains:
                          query.query,
                        mode: "insensitive",
                      },
                    },
                    ...(ticketNumber ===
                    null
                      ? []
                      : [
                          {
                            number:
                              ticketNumber,
                          },
                        ]),
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
}

function createAssetEventWhere({
  organizationId,
  rangeStart,
  query,
}: {
  organizationId: string;
  rangeStart: Date;
  query: AuditLogQuery;
}): Prisma.AssetEventWhereInput {
  return {
    asset: {
      organizationId,
    },
    createdAt: {
      gte: rangeStart,
    },
    ...createActorWhere(
      query.actorId,
    ),
    ...(query.query
      ? {
          OR: [
            ...actionSearch(
              query.query,
            ),
            actorSearch(query.query),
            {
              asset: {
                is: {
                  OR: [
                    {
                      assetTag: {
                        contains:
                          query.query,
                        mode: "insensitive",
                      },
                    },
                    {
                      name: {
                        contains:
                          query.query,
                        mode: "insensitive",
                      },
                    },
                    {
                      type: {
                        contains:
                          query.query,
                        mode: "insensitive",
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
}

function createMembershipEventWhere({
  organizationId,
  rangeStart,
  query,
}: {
  organizationId: string;
  rangeStart: Date;
  query: AuditLogQuery;
}): Prisma.MembershipEventWhereInput {
  return {
    membership: {
      organizationId,
    },
    createdAt: {
      gte: rangeStart,
    },
    ...createActorWhere(
      query.actorId,
    ),
    ...(query.query
      ? {
          OR: [
            ...actionSearch(
              query.query,
            ),
            actorSearch(query.query),
            {
              membership: {
                is: {
                  user: {
                    is: {
                      OR: [
                        {
                          name: {
                            contains:
                              query.query,
                            mode: "insensitive",
                          },
                        },
                        {
                          email: {
                            contains:
                              query.query,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
}

function createWorkspaceEventWhere({
  organizationId,
  rangeStart,
  query,
}: {
  organizationId: string;
  rangeStart: Date;
  query: AuditLogQuery;
}): Prisma.OrganizationEventWhereInput {
  return {
    organizationId,
    createdAt: {
      gte: rangeStart,
    },
    ...createActorWhere(
      query.actorId,
    ),
    ...(query.query
      ? {
          OR: [
            ...actionSearch(
              query.query,
            ),
            actorSearch(query.query),
            {
              organization: {
                is: {
                  name: {
                    contains:
                      query.query,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
}

function includesCategory(
  query: AuditLogQuery,
  category: Exclude<
    AuditLogQuery["category"],
    "ALL"
  >,
) {
  return (
    query.category === "ALL" ||
    query.category === category
  );
}

function formatGeneratedAt(
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

export async function getAuditLogData(
  query: AuditLogQuery,
  options: AuditLogLoadOptions = {},
): Promise<AuditLogData> {
  const workspace =
    await getAuthorizedWorkspace();

  if (
    !canViewAuditLog(
      workspace.membership.role,
    )
  ) {
    notFound();
  }

  const organization =
    workspace.organization;
  const now = new Date();
  const rangeStart =
    getAuditLogRangeStart(
      query.range,
      now,
    );

  const ticketWhere =
    createTicketEventWhere({
      organizationId:
        organization.id,
      rangeStart,
      query,
    });
  const assetWhere =
    createAssetEventWhere({
      organizationId:
        organization.id,
      rangeStart,
      query,
    });
  const membershipWhere =
    createMembershipEventWhere({
      organizationId:
        organization.id,
      rangeStart,
      query,
    });
  const workspaceWhere =
    createWorkspaceEventWhere({
      organizationId:
        organization.id,
      rangeStart,
      query,
    });

  const includeTickets =
    includesCategory(query, "TICKET");
  const includeAssets =
    includesCategory(query, "ASSET");
  const includeMembers =
    includesCategory(query, "MEMBER");
  const includeWorkspace =
    includesCategory(
      query,
      "WORKSPACE",
    );

  const [
    ticketCount,
    assetCount,
    memberCount,
    workspaceCount,
    actors,
  ] = await Promise.all([
    includeTickets
      ? prisma.ticketEvent.count({
          where: ticketWhere,
        })
      : 0,
    includeAssets
      ? prisma.assetEvent.count({
          where: assetWhere,
        })
      : 0,
    includeMembers
      ? prisma.membershipEvent.count({
          where: membershipWhere,
        })
      : 0,
    includeWorkspace
      ? prisma.organizationEvent.count({
          where: workspaceWhere,
        })
      : 0,
    prisma.user.findMany({
      where: {
        OR: [
          {
            events: {
              some: {
                ticket: {
                  organizationId:
                    organization.id,
                },
              },
            },
          },
          {
            assetEvents: {
              some: {
                asset: {
                  organizationId:
                    organization.id,
                },
              },
            },
          },
          {
            membershipEvents: {
              some: {
                membership: {
                  organizationId:
                    organization.id,
                },
              },
            },
          },
          {
            organizationEvents: {
              some: {
                organizationId:
                  organization.id,
              },
            },
          },
        ],
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
  ]);

  const totalItems =
    ticketCount +
    assetCount +
    memberCount +
    workspaceCount;
  const pageSize = Math.min(
    Math.max(
      options.pageSize ??
        DEFAULT_PAGE_SIZE,
      1,
    ),
    MAX_EXPORT_SIZE,
  );
  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / pageSize),
  );
  const requestedPage =
    options.firstPageOnly
      ? 1
      : query.page;
  const page = Math.min(
    requestedPage,
    totalPages,
  );
  const takePerCategory =
    options.firstPageOnly
      ? MAX_EXPORT_SIZE
      : page * pageSize;

  const [
    ticketEvents,
    assetEvents,
    membershipEvents,
    workspaceEvents,
  ] = await Promise.all([
    includeTickets
      ? prisma.ticketEvent.findMany({
          where: ticketWhere,
          orderBy: {
            createdAt: "desc",
          },
          take: takePerCategory,
          select: {
            id: true,
            action: true,
            fromValue: true,
            toValue: true,
            metadata: true,
            createdAt: true,
            actor: {
              select: actorSelect,
            },
            ticket: {
              select: {
                id: true,
                number: true,
                type: true,
                title: true,
              },
            },
          },
        })
      : [],
    includeAssets
      ? prisma.assetEvent.findMany({
          where: assetWhere,
          orderBy: {
            createdAt: "desc",
          },
          take: takePerCategory,
          select: {
            id: true,
            action: true,
            fromValue: true,
            toValue: true,
            metadata: true,
            createdAt: true,
            actor: {
              select: actorSelect,
            },
            asset: {
              select: {
                id: true,
                assetTag: true,
                name: true,
              },
            },
          },
        })
      : [],
    includeMembers
      ? prisma.membershipEvent.findMany({
          where: membershipWhere,
          orderBy: {
            createdAt: "desc",
          },
          take: takePerCategory,
          select: {
            id: true,
            action: true,
            fromValue: true,
            toValue: true,
            metadata: true,
            createdAt: true,
            actor: {
              select: actorSelect,
            },
            membership: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        })
      : [],
    includeWorkspace
      ? prisma.organizationEvent.findMany({
          where: workspaceWhere,
          orderBy: {
            createdAt: "desc",
          },
          take: takePerCategory,
          select: {
            id: true,
            action: true,
            fromValue: true,
            toValue: true,
            metadata: true,
            createdAt: true,
            actor: {
              select: actorSelect,
            },
            organization: {
              select: {
                name: true,
              },
            },
          },
        })
      : [],
  ]);

  const allRecords: AuditLogRecord[] = [
    ...ticketEvents.map((event) =>
      formatTicketAuditEvent(
        event,
        organization.timezone,
      ),
    ),
    ...assetEvents.map((event) =>
      formatAssetAuditEvent(
        event,
        organization.timezone,
      ),
    ),
    ...membershipEvents.map((event) =>
      formatMembershipAuditEvent(
        event,
        organization.timezone,
      ),
    ),
    ...workspaceEvents.map((event) =>
      formatWorkspaceAuditEvent(
        event,
        organization.timezone,
      ),
    ),
  ].sort((left, right) =>
    right.occurredAtIso.localeCompare(
      left.occurredAtIso,
    ),
  );

  const firstRecordIndex =
    (page - 1) * pageSize;
  const records = allRecords.slice(
    firstRecordIndex,
    firstRecordIndex + pageSize,
  );
  const firstItem =
    totalItems === 0
      ? 0
      : firstRecordIndex + 1;
  const lastItem =
    totalItems === 0
      ? 0
      : Math.min(
          firstRecordIndex +
            records.length,
          totalItems,
        );

  return {
    organizationName:
      organization.name,
    generatedAt: formatGeneratedAt(
      now,
      organization.timezone,
    ),
    query: {
      ...query,
      page,
    },
    records,
    actorOptions: [
      {
        value: "ALL",
        label: "All actors",
      },
      ...actors.map(
        (actor) => ({
          value: actor.id,
          label: `${actor.name} · ${actor.email}`,
        }),
      ),
      {
        value: "SYSTEM",
        label: "System or removed user",
      },
    ],
    metrics: [
      {
        label: "Matching events",
        value: totalItems,
        description: `Within the last ${
          query.range === "7d"
            ? 7
            : query.range === "90d"
              ? 90
              : 30
        } days`,
      },
      {
        label: "Ticket events",
        value: ticketCount,
        description:
          "Creation, status, assignment, and conversation",
      },
      {
        label: "Asset events",
        value: assetCount,
        description:
          "Lifecycle and ownership changes",
      },
      {
        label: "Administrative",
        value:
          memberCount +
          workspaceCount,
        description:
          "Membership and workspace settings",
      },
    ],
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      firstItem,
      lastItem,
    },
  };
}
