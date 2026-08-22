import "server-only";

import { notFound } from "next/navigation";

import { getAuthorizedWorkspace } from "@/features/auth/server/authorization";
import {
  canManageMembership,
  canViewPeopleDirectory,
  getAssignableMembershipRoles,
} from "@/features/people/policies/people-authorization";
import type {
  PeopleDirectoryData,
  PeopleMembershipStatus,
} from "@/features/people/types/people-directory";
import { prisma } from "@/lib/prisma";

function formatRole(role: string) {
  const normalized = role
    .toLowerCase()
    .replaceAll("_", " ");

  return `${normalized
    .charAt(0)
    .toUpperCase()}${normalized.slice(1)}`;
}

function formatStatus(
  status: string,
): PeopleMembershipStatus {
  switch (status) {
    case "INVITED":
      return "Invited";
    case "SUSPENDED":
      return "Suspended";
    default:
      return "Active";
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

type SnapshotField = {
  exists: boolean;
  value: string | null;
};

function getSnapshotField(
  snapshot: unknown,
  field: string,
): SnapshotField {
  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    Array.isArray(snapshot)
  ) {
    return {
      exists: false,
      value: null,
    };
  }

  const record =
    snapshot as Record<string, unknown>;

  if (
    !Object.prototype.hasOwnProperty.call(
      record,
      field,
    )
  ) {
    return {
      exists: false,
      value: null,
    };
  }

  const value = record[field];

  if (value === null) {
    return {
      exists: true,
      value: null,
    };
  }

  if (typeof value === "string") {
    return {
      exists: true,
      value,
    };
  }

  return {
    exists: false,
    value: null,
  };
}

function formatSnapshotValue(
  field: string,
  value: string | null,
) {
  if (!value) {
    return field === "department"
      ? "No department"
      : "None";
  }

  if (field === "role") {
    return formatRole(value);
  }

  if (field === "status") {
    return formatStatus(value);
  }

  return value;
}

function createEventSummary(
  fromValue: unknown,
  toValue: unknown,
) {
  const fields = [
    {
      key: "role",
      label: "Role",
    },
    {
      key: "status",
      label: "Status",
    },
    {
      key: "department",
      label: "Department",
    },
  ];

  const changes = fields.flatMap(
    ({ key, label }) => {
      const previous = getSnapshotField(
        fromValue,
        key,
      );
      const next = getSnapshotField(
        toValue,
        key,
      );

      if (
        !previous.exists ||
        !next.exists ||
        previous.value === next.value
      ) {
        return [];
      }

      return [
        `${label}: ${formatSnapshotValue(
          key,
          previous.value,
        )} → ${formatSnapshotValue(
          key,
          next.value,
        )}`,
      ];
    },
  );

  return changes.length > 0
    ? changes.join(" · ")
    : "Membership details changed.";
}

export async function getPeopleDirectoryData(): Promise<PeopleDirectoryData> {
  const workspace =
    await getAuthorizedWorkspace();

  if (
    !canViewPeopleDirectory(
      workspace.membership.role,
    )
  ) {
    notFound();
  }

  const organization =
    workspace.organization;

  const memberships =
    await prisma.membership.findMany({
      where: {
        organizationId: organization.id,
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          user: {
            name: "asc",
          },
        },
      ],
      select: {
        id: true,
        role: true,
        status: true,
        department: true,
        createdAt: true,
        events: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            _count: {
              select: {
                requestedTickets: {
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
                },
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
                },
                assignedAssets: {
                  where: {
                    organizationId:
                      organization.id,
                  },
                },
              },
            },
          },
        },
      },
    });

  const records = memberships.map(
    (membership) => {
      const isCurrentUser =
        membership.user.id ===
        workspace.user.id;

      const canManage =
        membership.status !== "INVITED" &&
        canManageMembership({
          actorRole:
            workspace.membership.role,
          targetRole: membership.role,
          isSelf: isCurrentUser,
        });

      return {
        membershipId: membership.id,
        userId: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        avatarUrl:
          membership.user.avatarUrl,
        role: membership.role,
        roleLabel: formatRole(
          membership.role,
        ),
        membershipStatus:
          membership.status,
        status: formatStatus(
          membership.status,
        ),
        department:
          membership.department ??
          "No department",
        departmentValue:
          membership.department ?? "",
        joinedAt: formatDate(
          membership.createdAt,
          organization.timezone,
        ),
        openRequestedTickets:
          membership.user._count
            .requestedTickets,
        openAssignedTickets:
          membership.user._count
            .assignedTickets,
        assignedAssets:
          membership.user._count
            .assignedAssets,
        isCurrentUser,
        canManage,
        assignableRoles: canManage
          ? [
              ...getAssignableMembershipRoles(
                workspace.membership.role,
              ),
            ]
          : [],
        recentEvents:
          membership.events.map(
            (event) => ({
              id: event.id,
              action:
                event.action ===
                "MEMBERSHIP_UPDATED"
                  ? "Membership updated"
                  : formatRole(
                      event.action,
                    ),
              summary: createEventSummary(
                event.fromValue,
                event.toValue,
              ),
              actorName:
                event.actor?.name ??
                "Former member",
              occurredAt: formatDateTime(
                event.createdAt,
                organization.timezone,
              ),
            }),
          ),
      };
    },
  );

  const activeCount = records.filter(
    (record) =>
      record.status === "Active",
  ).length;

  const operationalCount = records.filter(
    (record) =>
      record.role === "TECHNICIAN" ||
      record.role === "MANAGER",
  ).length;

  const suspendedCount = records.filter(
    (record) =>
      record.status === "Suspended",
  ).length;

  return {
    organizationName: organization.name,
    records,
    metrics: [
      {
        label: "Members",
        value: records.length,
        description: "In this workspace",
      },
      {
        label: "Active",
        value: activeCount,
        description: "Can access DeskOps",
      },
      {
        label: "Operations",
        value: operationalCount,
        description:
          "Managers and technicians",
      },
      {
        label: "Suspended",
        value: suspendedCount,
        description:
          "Access currently blocked",
      },
    ],
  };
}