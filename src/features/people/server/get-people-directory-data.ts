import "server-only";

import { notFound } from "next/navigation";

import { getAuthorizedWorkspace } from "@/features/auth/server/authorization";
import { canViewPeopleDirectory } from "@/features/people/policies/people-authorization";
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
        organizationId:
          organization.id,
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
    (membership) => ({
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
      status: formatStatus(
        membership.status,
      ),
      department:
        membership.department ??
        "No department",
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
    }),
  );

  const activeCount =
    records.filter(
      (record) =>
        record.status === "Active",
    ).length;

  const operationalCount =
    records.filter(
      (record) =>
        record.role === "TECHNICIAN" ||
        record.role === "MANAGER",
    ).length;

  const suspendedCount =
    records.filter(
      (record) =>
        record.status ===
        "Suspended",
    ).length;

  return {
    organizationName:
      organization.name,
    records,
    metrics: [
      {
        label: "Members",
        value: records.length,
        description:
          "In this workspace",
      },
      {
        label: "Active",
        value: activeCount,
        description:
          "Can access DeskOps",
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