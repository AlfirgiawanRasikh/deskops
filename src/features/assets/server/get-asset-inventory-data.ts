import "server-only";

import {
  canViewOrganizationAssets,
  getAssetReadScope,
  getAuthorizedWorkspace,
} from "@/features/auth/server/authorization";
import {
  canAssignAssets,
  canUpdateAssetStatus,
} from "@/features/assets/policies/asset-authorization";
import type {
  AssetInventoryData,
  AssetInventoryStatus,
  AssetWarrantyState,
} from "@/features/assets/types/asset-inventory";
import { prisma } from "@/lib/prisma";

function mapStatus(
  status: string,
): AssetInventoryStatus {
  switch (status) {
    case "ASSIGNED":
      return "Assigned";

    case "IN_REPAIR":
      return "In repair";

    case "RETIRED":
      return "Retired";

    case "LOST":
      return "Lost";

    default:
      return "In stock";
  }
}

function formatEnum(
  value: string | null,
) {
  if (!value) {
    return "empty";
  }

  const normalized = value
    .toLowerCase()
    .replaceAll("_", " ");

  return `${normalized
    .charAt(0)
    .toUpperCase()}${normalized.slice(1)}`;
}

function formatDate(
  date: Date,
  timeZone: string,
) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(date);
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

function getWarrantyDetails(
  expiresAt: Date | null,
  now: Date,
  timeZone: string,
): {
  label: string;
  state: AssetWarrantyState;
} {
  if (!expiresAt) {
    return {
      label: "Not recorded",
      state: "none",
    };
  }

  const remainingDays = Math.ceil(
    (expiresAt.getTime() -
      now.getTime()) /
      86_400_000,
  );

  if (remainingDays < 0) {
    return {
      label: `Expired ${formatDate(
        expiresAt,
        timeZone,
      )}`,
      state: "expired",
    };
  }

  if (remainingDays <= 90) {
    return {
      label: `Expires ${formatDate(
        expiresAt,
        timeZone,
      )}`,
      state: "expiring",
    };
  }

  return {
    label: `Until ${formatDate(
      expiresAt,
      timeZone,
    )}`,
    state: "active",
  };
}

function formatActivity(event: {
  action: string;
  fromValue: string | null;
  toValue: string | null;
}) {
  if (
    event.action === "STATUS_CHANGED"
  ) {
    return `Changed status from ${formatEnum(
      event.fromValue,
    )} to ${formatEnum(
      event.toValue,
    )}.`;
  }

  if (
    event.action ===
    "ASSIGNMENT_CHANGED"
  ) {
    return event.toValue
      ? `Assigned the asset to ${event.toValue}.`
      : "Returned the asset to the unassigned inventory.";
  }

  return "Updated this asset.";
}

export async function getAssetInventoryData(): Promise<AssetInventoryData> {
  const workspace =
    await getAuthorizedWorkspace();

  const organization =
    workspace.organization;

  const role =
    workspace.membership.role;

  const now = new Date();

  const canReadOrganizationInventory =
    canViewOrganizationAssets(role);

  const canAssign =
    canAssignAssets(role);

  const canUpdateStatus =
    canUpdateAssetStatus(role);

  const assets =
    await prisma.asset.findMany({
      where: getAssetReadScope({
        organizationId:
          organization.id,
        userId: workspace.user.id,
        role,
      }),
      orderBy: {
        assetTag: "asc",
      },
      select: {
        id: true,
        assetTag: true,
        name: true,
        type: true,
        status: true,
        serialNumber: true,
        manufacturer: true,
        model: true,
        purchaseDate: true,
        warrantyExpiresAt: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            tickets: {
              where: {
                status: {
                  notIn: [
                    "RESOLVED",
                    "CLOSED",
                    "CANCELED",
                  ],
                },
              },
            },
          },
        },
      },
    });

  const memberMemberships =
    canAssign
      ? await prisma.membership.findMany(
          {
            where: {
              organizationId:
                organization.id,
              status: "ACTIVE",
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
          },
        )
      : [];

  const events =
    canReadOrganizationInventory &&
    assets.length > 0
      ? await prisma.assetEvent.findMany(
          {
            where: {
              assetId: {
                in: assets.map(
                  (asset) =>
                    asset.id,
                ),
              },
              asset: {
                organizationId:
                  organization.id,
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: Math.max(
              assets.length * 8,
              8,
            ),
            select: {
              id: true,
              assetId: true,
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
        )
      : [];

  const activityByAsset = new Map<
    string,
    AssetInventoryData["records"][number]["activity"]
  >();

  for (const event of events) {
    const activity =
      activityByAsset.get(
        event.assetId,
      ) ?? [];

    if (activity.length >= 8) {
      continue;
    }

    activity.push({
      id: event.id,
      description:
        formatActivity(event),
      actorName:
        event.actor?.name ??
        "System",
      createdAt: formatDateTime(
        event.createdAt,
        organization.timezone,
      ),
    });

    activityByAsset.set(
      event.assetId,
      activity,
    );
  }

  const records = assets.map(
    (asset) => {
      const warranty =
        getWarrantyDetails(
          asset.warrantyExpiresAt,
          now,
          organization.timezone,
        );

      return {
        databaseId: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
        type: asset.type,
        status:
          mapStatus(asset.status),
        statusValue: asset.status,
        serialNumber:
          asset.serialNumber,
        manufacturer:
          asset.manufacturer,
        model: asset.model,
        assignedTo:
          asset.assignedTo,
        purchaseDate:
          asset.purchaseDate
            ? formatDate(
                asset.purchaseDate,
                organization.timezone,
              )
            : null,
        warrantyLabel:
          warranty.label,
        warrantyState:
          warranty.state,
        openTicketCount:
          asset._count.tickets,
        activity:
          activityByAsset.get(
            asset.id,
          ) ?? [],
      };
    },
  );

  const assignedCount =
    records.filter(
      (asset) =>
        asset.status ===
        "Assigned",
    ).length;

  const attentionCount =
    records.filter(
      (asset) =>
        asset.status ===
          "In repair" ||
        asset.status === "Lost",
    ).length;

  const expiringCount =
    records.filter(
      (asset) =>
        asset.warrantyState ===
        "expiring",
    ).length;

  return {
    title:
      canReadOrganizationInventory
        ? "Asset inventory"
        : "My assets",
    description:
      canReadOrganizationInventory
        ? "Track ownership, lifecycle state, warranty coverage, and related support work."
        : "Devices currently assigned to your workspace account.",
    organizationName:
      organization.name,
    records,
    memberOptions:
      memberMemberships.map(
        (membership) => ({
          id: membership.user.id,
          name:
            membership.user.name,
          email:
            membership.user.email,
          department:
            membership.department ??
            "No department",
        }),
      ),
    capabilities: {
      canAssignAssets:
        canAssign,
      canUpdateAssetStatus:
        canUpdateStatus,
      canViewAuditHistory:
        canReadOrganizationInventory,
    },
    metrics: [
      {
        label: "Visible assets",
        value: records.length,
        description:
          canReadOrganizationInventory
            ? "Across this workspace"
            : "Assigned to you",
      },
      {
        label: "Assigned",
        value: assignedCount,
        description:
          "Currently in use",
      },
      {
        label:
          "Needs attention",
        value: attentionCount,
        description:
          "In repair or reported lost",
      },
      {
        label: "Warranty due",
        value: expiringCount,
        description:
          "Within the next 90 days",
      },
    ],
  };
}