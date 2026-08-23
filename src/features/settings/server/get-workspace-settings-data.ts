import "server-only";

import { notFound } from "next/navigation";

import { getAuthorizedWorkspace } from "@/features/auth/server/authorization";
import {
  defaultServiceLevelPolicies,
  serviceLevelPriorities,
  type ServiceLevelPriority,
} from "@/features/settings/constants/service-level-policies";
import {
  canUpdateWorkspaceSettings,
  canViewWorkspaceSettings,
} from "@/features/settings/policies/settings-authorization";
import type { WorkspaceSettingsData } from "@/features/settings/types/workspace-settings";
import { prisma } from "@/lib/prisma";

function formatEnumLabel(value: string) {
  const normalized = value
    .toLowerCase()
    .replaceAll("_", " ");

  return `${normalized
    .charAt(0)
    .toUpperCase()}${normalized.slice(1)}`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  if (minutes % 1440 === 0) {
    const days = minutes / 1440;

    return `${days} ${
      days === 1 ? "day" : "days"
    }`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;

    return `${hours} ${
      hours === 1 ? "hour" : "hours"
    }`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

function formatDateTime(
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

function getChangedFields(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    !("changedFields" in value)
  ) {
    return [];
  }

  const changedFields = value.changedFields;

  if (!Array.isArray(changedFields)) {
    return [];
  }

  return changedFields.filter(
    (field): field is string =>
      typeof field === "string",
  );
}

function formatActivitySummary(
  metadata: unknown,
) {
  const changedFields =
    getChangedFields(metadata);

  if (changedFields.length === 0) {
    return "Workspace configuration was updated.";
  }

  return `Updated ${changedFields.join(", ")}.`;
}

export async function getWorkspaceSettingsData(): Promise<WorkspaceSettingsData> {
  const workspace =
    await getAuthorizedWorkspace();

  if (
    !canViewWorkspaceSettings(
      workspace.membership.role,
    )
  ) {
    notFound();
  }

  const organization =
    await prisma.organization.findUnique({
      where: {
        id: workspace.organization.id,
      },
      select: {
        name: true,
        slug: true,
        timezone: true,
        serviceLevelPolicies: {
          select: {
            priority: true,
            firstResponseMinutes: true,
            resolutionMinutes: true,
          },
        },
        events: {
          orderBy: {
            createdAt: "desc",
          },
          take: 8,
          select: {
            id: true,
            action: true,
            metadata: true,
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

  if (!organization) {
    notFound();
  }

  const configuredPolicies = new Map(
    organization.serviceLevelPolicies.map(
      (policy) => [
        policy.priority,
        policy,
      ],
    ),
  );

  return {
    organization: {
      name: organization.name,
      slug: organization.slug,
      timezone: organization.timezone,
    },
    serviceLevelPolicies:
      serviceLevelPriorities.map(
        (priority) => {
          const configured =
            configuredPolicies.get(
              priority,
            );

          const target =
            configured ??
            defaultServiceLevelPolicies[
              priority as ServiceLevelPriority
            ];

          return {
            priority,
            priorityLabel:
              formatEnumLabel(priority),
            firstResponseMinutes:
              target.firstResponseMinutes,
            resolutionMinutes:
              target.resolutionMinutes,
            firstResponseLabel:
              formatDuration(
                target.firstResponseMinutes,
              ),
            resolutionLabel:
              formatDuration(
                target.resolutionMinutes,
              ),
          };
        },
      ),
    recentActivity: organization.events.map(
      (event) => ({
        id: event.id,
        action:
          event.action ===
          "WORKSPACE_SETTINGS_UPDATED"
            ? "Settings updated"
            : formatEnumLabel(event.action),
        summary: formatActivitySummary(
          event.metadata,
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
    capabilities: {
      canUpdate:
        canUpdateWorkspaceSettings(
          workspace.membership.role,
        ),
    },
  };
}
