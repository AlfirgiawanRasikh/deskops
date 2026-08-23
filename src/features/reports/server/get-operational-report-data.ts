import "server-only";

import { notFound } from "next/navigation";

import { getAuthorizedWorkspace } from "@/features/auth/server/authorization";
import { canViewOperationalReports } from "@/features/reports/policies/report-authorization";
import type {
  OperationalReportData,
  ReportBreakdownItem,
  ReportTrendPoint,
} from "@/features/reports/types/operational-report";
import {
  getOperationalReportRangeConfiguration,
  parseOperationalReportRange,
} from "@/features/reports/utils/report-range";
import { prisma } from "@/lib/prisma";

const millisecondsPerDay =
  24 * 60 * 60 * 1000;

function formatEnumLabel(value: string) {
  const normalized = value
    .toLowerCase()
    .replaceAll("_", " ");

  return `${normalized
    .charAt(0)
    .toUpperCase()}${normalized.slice(1)}`;
}

function formatGeneratedAt(
  value: Date,
  timeZone: string,
) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(value);
}

function formatBucketDate(
  value: Date,
  timeZone: string,
) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone,
  }).format(value);
}

function createBreakdown(
  counts: Map<string, number>,
  labelFormatter: (
    value: string,
  ) => string = formatEnumLabel,
): ReportBreakdownItem[] {
  return [...counts.entries()]
    .map(([key, value]) => ({
      key,
      label: labelFormatter(key),
      value,
    }))
    .sort(
      (first, second) =>
        second.value - first.value ||
        first.label.localeCompare(
          second.label,
        ),
    );
}

function incrementCount(
  counts: Map<string, number>,
  key: string,
) {
  counts.set(
    key,
    (counts.get(key) ?? 0) + 1,
  );
}

function createTrend({
  startDate,
  endDate,
  bucketDays,
  timeZone,
  createdDates,
  resolvedDates,
}: {
  startDate: Date;
  endDate: Date;
  bucketDays: number;
  timeZone: string;
  createdDates: Date[];
  resolvedDates: Date[];
}): ReportTrendPoint[] {
  const bucketDuration =
    bucketDays * millisecondsPerDay;

  const bucketCount = Math.ceil(
    (endDate.getTime() -
      startDate.getTime()) /
      bucketDuration,
  );

  const buckets = Array.from(
    {
      length: bucketCount,
    },
    (_, index) => {
      const bucketStart = new Date(
        startDate.getTime() +
          index * bucketDuration,
      );

      const calculatedEnd = new Date(
        bucketStart.getTime() +
          bucketDuration,
      );

      const bucketEnd =
        calculatedEnd > endDate
          ? endDate
          : calculatedEnd;

      const finalDisplayDate = new Date(
        Math.max(
          bucketStart.getTime(),
          bucketEnd.getTime() - 1,
        ),
      );

      return {
        key: bucketStart.toISOString(),
        label:
          bucketDays === 1
            ? formatBucketDate(
                bucketStart,
                timeZone,
              )
            : `${formatBucketDate(
                bucketStart,
                timeZone,
              )}–${formatBucketDate(
                finalDisplayDate,
                timeZone,
              )}`,
        created: 0,
        resolved: 0,
      };
    },
  );

  function addDates(
    dates: Date[],
    field: "created" | "resolved",
  ) {
    for (const date of dates) {
      const rawIndex = Math.floor(
        (date.getTime() -
          startDate.getTime()) /
          bucketDuration,
      );

      if (rawIndex < 0) {
        continue;
      }

      const index = Math.min(
        rawIndex,
        buckets.length - 1,
      );

      const bucket = buckets[index];

      if (bucket) {
        bucket[field] += 1;
      }
    }
  }

  addDates(createdDates, "created");
  addDates(resolvedDates, "resolved");

  return buckets;
}

function getAssetModelLabel({
  manufacturer,
  model,
}: {
  manufacturer: string | null;
  model: string | null;
}) {
  const label = [
    manufacturer,
    model,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return label || "Unknown model";
}

function isOperationalWorkloadRole(
  role: string,
): role is "MANAGER" | "TECHNICIAN" {
  return (
    role === "MANAGER" ||
    role === "TECHNICIAN"
  );
}

export async function getOperationalReportData(
  requestedRange:
    | string
    | string[]
    | undefined,
): Promise<OperationalReportData> {
  const workspace =
    await getAuthorizedWorkspace();

  if (
    !canViewOperationalReports(
      workspace.membership.role,
    )
  ) {
    notFound();
  }

  const range =
    parseOperationalReportRange(
      requestedRange,
    );

  const configuration =
    getOperationalReportRangeConfiguration(
      range,
    );

  const now = new Date();

  const startDate = new Date(
    now.getTime() -
      configuration.days *
        millisecondsPerDay,
  );

  const organization =
    workspace.organization;

  const [
    rangeTickets,
    openTickets,
    operationalMemberships,
    assets,
  ] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        organizationId:
          organization.id,
        OR: [
          {
            createdAt: {
              gte: startDate,
              lte: now,
            },
          },
          {
            resolvedAt: {
              gte: startDate,
              lte: now,
            },
          },
        ],
      },
      select: {
        id: true,
        category: true,
        createdAt: true,
        resolvedAt: true,
        resolutionDueAt: true,
        asset: {
          select: {
            manufacturer: true,
            model: true,
          },
        },
      },
    }),
    prisma.ticket.findMany({
      where: {
        organizationId:
          organization.id,
        status: {
          notIn: [
            "RESOLVED",
            "CLOSED",
            "CANCELED",
          ],
        },
      },
      select: {
        id: true,
        status: true,
        priority: true,
        resolutionDueAt: true,
        assigneeId: true,
      },
    }),
    prisma.membership.findMany({
      where: {
        organizationId:
          organization.id,
        status: "ACTIVE",
        role: {
          in: [
            "MANAGER",
            "TECHNICIAN",
          ],
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            assignedTickets: {
              where: {
                organizationId:
                  organization.id,
                status: {
                  notIn: [
                    "RESOLVED",
                    "CLOSED",
                    "CANCELED",
                  ],
                },
              },
              select: {
                priority: true,
                resolutionDueAt: true,
              },
            },
          },
        },
      },
    }),
    prisma.asset.findMany({
      where: {
        organizationId:
          organization.id,
      },
      select: {
        status: true,
      },
    }),
  ]);

  const createdTickets =
    rangeTickets.filter(
      (ticket) =>
        ticket.createdAt >= startDate &&
        ticket.createdAt <= now,
    );

  const resolvedTickets =
    rangeTickets.filter(
      (ticket) =>
        ticket.resolvedAt !== null &&
        ticket.resolvedAt >= startDate &&
        ticket.resolvedAt <= now,
    );

  const ticketsWithResolutionTarget =
    resolvedTickets.filter(
      (ticket) =>
        ticket.resolutionDueAt !== null &&
        ticket.resolvedAt !== null,
    );

  const compliantTickets =
    ticketsWithResolutionTarget.filter(
      (ticket) =>
        ticket.resolvedAt !== null &&
        ticket.resolutionDueAt !== null &&
        ticket.resolvedAt <=
          ticket.resolutionDueAt,
    );

  const slaComplianceRate =
    ticketsWithResolutionTarget.length > 0
      ? Math.round(
          (compliantTickets.length /
            ticketsWithResolutionTarget.length) *
            100,
        )
      : null;

  const totalResolutionMilliseconds =
    resolvedTickets.reduce(
      (total, ticket) => {
        if (!ticket.resolvedAt) {
          return total;
        }

        return (
          total +
          (ticket.resolvedAt.getTime() -
            ticket.createdAt.getTime())
        );
      },
      0,
    );

  const meanResolutionHours =
    resolvedTickets.length > 0
      ? Number(
          (
            totalResolutionMilliseconds /
            resolvedTickets.length /
            (60 * 60 * 1000)
          ).toFixed(1),
        )
      : null;

  const overdueTickets =
    openTickets.filter(
      (ticket) =>
        ticket.resolutionDueAt !== null &&
        ticket.resolutionDueAt < now,
    );

  const statusCounts =
    new Map<string, number>();

  const priorityCounts =
    new Map<string, number>();

  for (const ticket of openTickets) {
    incrementCount(
      statusCounts,
      ticket.status,
    );

    incrementCount(
      priorityCounts,
      ticket.priority,
    );
  }

  const categoryCounts =
    new Map<string, number>();

  const affectedAssetModelCounts =
    new Map<string, number>();

  for (const ticket of createdTickets) {
    incrementCount(
      categoryCounts,
      ticket.category,
    );

    if (ticket.asset) {
      incrementCount(
        affectedAssetModelCounts,
        getAssetModelLabel(
          ticket.asset,
        ),
      );
    }
  }

  const assetStatusCounts =
    new Map<string, number>();

  for (const asset of assets) {
    incrementCount(
      assetStatusCounts,
      asset.status,
    );
  }

  const technicianWorkload =
    operationalMemberships
      .flatMap((membership) => {
        if (
          !isOperationalWorkloadRole(
            membership.role,
          )
        ) {
          return [];
        }

        const assignedTickets =
          membership.user.assignedTickets;

        return [
          {
            membershipId:
              membership.id,
            userId:
              membership.user.id,
            name: membership.user.name,
            role: membership.role,
            roleLabel: formatEnumLabel(
              membership.role,
            ),
            openTickets:
              assignedTickets.length,
            urgentTickets:
              assignedTickets.filter(
                (ticket) =>
                  ticket.priority ===
                  "URGENT",
              ).length,
            overdueTickets:
              assignedTickets.filter(
                (ticket) =>
                  ticket.resolutionDueAt !==
                    null &&
                  ticket.resolutionDueAt <
                    now,
              ).length,
          },
        ];
      })
      .sort(
        (first, second) =>
          second.openTickets -
            first.openTickets ||
          second.urgentTickets -
            first.urgentTickets ||
          first.name.localeCompare(
            second.name,
          ),
      );

  return {
    organizationName:
      organization.name,
    range,
    rangeLabel:
      configuration.label,
    generatedAt: formatGeneratedAt(
      now,
      organization.timezone,
    ),
    summary: {
      createdTickets:
        createdTickets.length,
      resolvedTickets:
        resolvedTickets.length,
      openTickets:
        openTickets.length,
      overdueTickets:
        overdueTickets.length,
      slaComplianceRate,
      meanResolutionHours,
    },
    ticketTrend: createTrend({
      startDate,
      endDate: now,
      bucketDays:
        configuration.bucketDays,
      timeZone:
        organization.timezone,
      createdDates:
        createdTickets.map(
          (ticket) =>
            ticket.createdAt,
        ),
      resolvedDates:
        resolvedTickets.flatMap(
          (ticket) =>
            ticket.resolvedAt
              ? [ticket.resolvedAt]
              : [],
        ),
    }),
    statusBreakdown:
      createBreakdown(statusCounts),
    priorityBreakdown:
      createBreakdown(priorityCounts),
    categoryBreakdown:
      createBreakdown(
        categoryCounts,
        (value) => value,
      ).slice(0, 6),
    assetStatusBreakdown:
      createBreakdown(
        assetStatusCounts,
      ),
    affectedAssetModels:
      createBreakdown(
        affectedAssetModelCounts,
        (value) => value,
      ).slice(0, 6),
    technicianWorkload,
  };
}
