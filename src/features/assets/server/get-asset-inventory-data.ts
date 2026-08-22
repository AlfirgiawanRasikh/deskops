import "server-only";

import type {
  AssetInventoryData,
  AssetInventoryStatus,
  AssetWarrantyState,
} from "@/features/assets/types/asset-inventory";
import {
  canViewOrganizationAssets,
  getAssetReadScope,
  getAuthorizedWorkspace,
} from "@/features/auth/server/authorization";
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
    (expiresAt.getTime() - now.getTime()) /
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

export async function getAssetInventoryData(): Promise<AssetInventoryData> {
  const workspace =
    await getAuthorizedWorkspace();

  const organization =
    workspace.organization;

  const role =
    workspace.membership.role;

  const now = new Date();

  const assets =
    await prisma.asset.findMany({
      where: getAssetReadScope({
        organizationId: organization.id,
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

  const records = assets.map((asset) => {
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
      status: mapStatus(asset.status),
      serialNumber: asset.serialNumber,
      manufacturer: asset.manufacturer,
      model: asset.model,
      assignedTo: asset.assignedTo,
      purchaseDate: asset.purchaseDate
        ? formatDate(
            asset.purchaseDate,
            organization.timezone,
          )
        : null,
      warrantyLabel: warranty.label,
      warrantyState: warranty.state,
      openTicketCount:
        asset._count.tickets,
    };
  });

  const assignedCount =
    records.filter(
      (asset) =>
        asset.status === "Assigned",
    ).length;

  const attentionCount =
    records.filter(
      (asset) =>
        asset.status === "In repair" ||
        asset.status === "Lost",
    ).length;

  const expiringCount =
    records.filter(
      (asset) =>
        asset.warrantyState ===
        "expiring",
    ).length;

  const canReadOrganizationInventory =
    canViewOrganizationAssets(role);

  return {
    title: canReadOrganizationInventory
      ? "Asset inventory"
      : "My assets",
    description:
      canReadOrganizationInventory
        ? "Track ownership, lifecycle state, warranty coverage, and related support work."
        : "Devices currently assigned to your workspace account.",
    organizationName: organization.name,
    records,
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
        description: "Currently in use",
      },
      {
        label: "Needs attention",
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