import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getAuthorizedWorkspace } from "@/features/auth/server/authorization";
import { getGlobalSearchAuthorization } from "@/features/search/policies/global-search-authorization";
import { getGlobalSearchTicketType } from "@/features/search/schemas/global-search-query";
import type {
  GlobalSearchGroup,
  GlobalSearchResponse,
} from "@/features/search/types/global-search";
import { prisma } from "@/lib/prisma";

const RESULT_LIMIT = 5;

function formatEnum(value: string) {
  const normalized = value
    .toLowerCase()
    .replaceAll("_", " ");

  return `${normalized
    .charAt(0)
    .toUpperCase()}${normalized.slice(1)}`;
}

function getTicketNumber(
  query: string,
) {
  const match = query.match(
    /^(?:INC|REQ)?-?(\d+)$/i,
  );

  if (!match?.[1]) {
    return null;
  }

  const number = Number.parseInt(
    match[1],
    10,
  );

  return Number.isSafeInteger(number)
    ? number
    : null;
}

function createTicketSearchFilter(
  query: string,
): Prisma.TicketWhereInput {
  const ticketNumber =
    getTicketNumber(query);
  const ticketType =
    getGlobalSearchTicketType(query);

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
      ...(ticketType === null
        ? []
        : [
            {
              type: ticketType,
            },
          ]),
    ],
  };
}

function createAssetSearchFilter(
  query: string,
): Prisma.AssetWhereInput {
  return {
    OR: [
      {
        assetTag: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        type: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        serialNumber: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        manufacturer: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        model: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        assignedTo: {
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
    ],
  };
}

export async function searchWorkspace(
  query: string,
): Promise<GlobalSearchResponse> {
  const workspace =
    await getAuthorizedWorkspace();

  const organizationId =
    workspace.organization.id;
  const userId = workspace.user.id;
  const role = workspace.membership.role;

  const authorization =
    getGlobalSearchAuthorization({
      organizationId,
      userId,
      role,
    });

  const [tickets, assets, people] =
    await Promise.all([
      prisma.ticket.findMany({
        where: {
          ...authorization.ticketScope,
          ...createTicketSearchFilter(
            query,
          ),
        },
        orderBy: [
          {
            priority: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
        take: RESULT_LIMIT,
        select: {
          id: true,
          number: true,
          type: true,
          title: true,
          status: true,
          priority: true,
          requester: {
            select: {
              name: true,
            },
          },
        },
      }),

      prisma.asset.findMany({
        where: {
          ...authorization.assetScope,
          ...createAssetSearchFilter(
            query,
          ),
        },
        orderBy: {
          assetTag: "asc",
        },
        take: RESULT_LIMIT,
        select: {
          id: true,
          assetTag: true,
          name: true,
          model: true,
          status: true,
          assignedTo: {
            select: {
              name: true,
            },
          },
        },
      }),

      authorization.canSearchPeople
        ? prisma.membership.findMany({
            where: {
              organizationId,
              OR: [
                {
                  department: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  user: {
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
              ],
            },
            orderBy: {
              user: {
                name: "asc",
              },
            },
            take: RESULT_LIMIT,
            select: {
              id: true,
              role: true,
              status: true,
              department: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

  const ticketReturnPath =
    role === "EMPLOYEE"
      ? "/tickets/my-queue"
      : "/tickets";

  const ticketGroups: GlobalSearchGroup = {
    key: "ticket",
    label: "Tickets",
    results: tickets.map((ticket) => {
      const reference = `${
        ticket.type === "INCIDENT"
          ? "INC"
          : "REQ"
      }-${ticket.number}`;

      const parameters =
        new URLSearchParams({
          returnTo: ticketReturnPath,
        });

      return {
        id: ticket.id,
        kind: "ticket",
        title: ticket.title,
        subtitle: `${reference} · ${formatEnum(
          ticket.status,
        )}`,
        context: `${formatEnum(
          ticket.priority,
        )} · ${ticket.requester.name}`,
        href: `/tickets/${ticket.id}?${parameters.toString()}`,
      };
    }),
  };

  const assetGroups: GlobalSearchGroup = {
    key: "asset",
    label: "Assets",
    results: assets.map((asset) => ({
      id: asset.id,
      kind: "asset",
      title: `${asset.assetTag} · ${asset.name}`,
      subtitle:
        asset.model ?? "Unknown model",
      context: `${formatEnum(
        asset.status,
      )} · ${
        asset.assignedTo?.name ??
        "Unassigned"
      }`,
      href: `/assets?asset=${encodeURIComponent(
        asset.id,
      )}`,
    })),
  };

  const peopleGroups: GlobalSearchGroup = {
    key: "person",
    label: "People",
    results: people.map((membership) => ({
      id: membership.id,
      kind: "person",
      title: membership.user.name,
      subtitle: membership.user.email,
      context: `${formatEnum(
        membership.role,
      )} · ${
        membership.department ??
        "No department"
      } · ${formatEnum(
        membership.status,
      )}`,
      href: `/people?member=${encodeURIComponent(
        membership.id,
      )}`,
    })),
  };

  return {
    query,
    groups: [
      ticketGroups,
      assetGroups,
      peopleGroups,
    ].filter(
      (group) =>
        group.results.length > 0,
    ),
  };
}
