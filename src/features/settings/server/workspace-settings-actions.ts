"use server";

import { revalidatePath } from "next/cache";

import {
  AuthorizationError,
  getAuthorizedWorkspace,
} from "@/features/auth/server/authorization";
import {
  defaultServiceLevelPolicies,
  serviceLevelFieldNames,
  serviceLevelPriorities,
  type ServiceLevelPriority,
  type ServiceLevelTarget,
} from "@/features/settings/constants/service-level-policies";
import { canUpdateWorkspaceSettings } from "@/features/settings/policies/settings-authorization";
import {
  updateWorkspaceSettingsSchema,
  type UpdateWorkspaceSettingsInput,
} from "@/features/settings/schemas/workspace-settings";
import type {
  WorkspaceSettingsActionState,
  WorkspaceSettingsFieldErrors,
} from "@/features/settings/types/workspace-settings";
import { prisma } from "@/lib/prisma";

class WorkspaceSettingsActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name =
      "WorkspaceSettingsActionError";
  }
}

function errorState(
  message: string,
): WorkspaceSettingsActionState {
  return {
    status: "error",
    message,
    fieldErrors: {},
  };
}

function getSubmittedTargets(
  input: UpdateWorkspaceSettingsInput,
): Record<
  ServiceLevelPriority,
  ServiceLevelTarget
> {
  return {
    URGENT: {
      firstResponseMinutes:
        input.urgentFirstResponseMinutes,
      resolutionMinutes:
        input.urgentResolutionMinutes,
    },
    HIGH: {
      firstResponseMinutes:
        input.highFirstResponseMinutes,
      resolutionMinutes:
        input.highResolutionMinutes,
    },
    NORMAL: {
      firstResponseMinutes:
        input.normalFirstResponseMinutes,
      resolutionMinutes:
        input.normalResolutionMinutes,
    },
    LOW: {
      firstResponseMinutes:
        input.lowFirstResponseMinutes,
      resolutionMinutes:
        input.lowResolutionMinutes,
    },
  };
}

function getChangedFields({
  currentName,
  nextName,
  currentTimezone,
  nextTimezone,
  currentTargets,
  nextTargets,
}: {
  currentName: string;
  nextName: string;
  currentTimezone: string;
  nextTimezone: string;
  currentTargets: Record<
    ServiceLevelPriority,
    ServiceLevelTarget
  >;
  nextTargets: Record<
    ServiceLevelPriority,
    ServiceLevelTarget
  >;
}) {
  const fields: string[] = [];

  if (currentName !== nextName) {
    fields.push("workspace name");
  }

  if (currentTimezone !== nextTimezone) {
    fields.push("timezone");
  }

  for (const priority of serviceLevelPriorities) {
    const current = currentTargets[priority];
    const next = nextTargets[priority];

    if (
      current.firstResponseMinutes !==
        next.firstResponseMinutes ||
      current.resolutionMinutes !==
        next.resolutionMinutes
    ) {
      fields.push(
        `${priority.toLowerCase()} SLA`,
      );
    }
  }

  return fields;
}

export async function updateWorkspaceSettingsAction(
  _previousState: WorkspaceSettingsActionState,
  formData: FormData,
): Promise<WorkspaceSettingsActionState> {
  const submittedInput = {
    name: formData.get("name"),
    timezone: formData.get("timezone"),
    ...Object.fromEntries(
      serviceLevelPriorities.flatMap(
        (priority) => {
          const fields =
            serviceLevelFieldNames[
              priority
            ];

          return [
            [
              fields.firstResponse,
              formData.get(
                fields.firstResponse,
              ),
            ],
            [
              fields.resolution,
              formData.get(
                fields.resolution,
              ),
            ],
          ];
        },
      ),
    ),
  };

  const parsedInput =
    updateWorkspaceSettingsSchema.safeParse(
      submittedInput,
    );

  if (!parsedInput.success) {
    return {
      status: "error",
      message:
        "Review the highlighted workspace settings.",
      fieldErrors:
        parsedInput.error.flatten()
          .fieldErrors as WorkspaceSettingsFieldErrors,
    };
  }

  try {
    const workspace =
      await getAuthorizedWorkspace();

    if (
      !canUpdateWorkspaceSettings(
        workspace.membership.role,
      )
    ) {
      throw new WorkspaceSettingsActionError(
        "You do not have permission to update workspace settings.",
      );
    }

    const nextTargets =
      getSubmittedTargets(
        parsedInput.data,
      );

    const result =
      await prisma.$transaction(
        async (transaction) => {
          const organization =
            await transaction.organization.findUnique(
              {
                where: {
                  id: workspace.organization.id,
                },
                select: {
                  id: true,
                  name: true,
                  timezone: true,
                  serviceLevelPolicies: {
                    select: {
                      priority: true,
                      firstResponseMinutes:
                        true,
                      resolutionMinutes: true,
                    },
                  },
                },
              },
            );

          if (!organization) {
            throw new WorkspaceSettingsActionError(
              "The workspace could not be found.",
            );
          }

          const configuredTargets = new Map(
            organization.serviceLevelPolicies.map(
              (policy) => [
                policy.priority,
                policy,
              ],
            ),
          );

          const currentTargets =
            Object.fromEntries(
              serviceLevelPriorities.map(
                (priority) => {
                  const configured =
                    configuredTargets.get(
                      priority,
                    );

                  return [
                    priority,
                    configured ??
                      defaultServiceLevelPolicies[
                        priority
                      ],
                  ];
                },
              ),
            ) as Record<
              ServiceLevelPriority,
              ServiceLevelTarget
            >;

          const changedFields =
            getChangedFields({
              currentName:
                organization.name,
              nextName:
                parsedInput.data.name,
              currentTimezone:
                organization.timezone,
              nextTimezone:
                parsedInput.data.timezone,
              currentTargets,
              nextTargets,
            });

          if (changedFields.length === 0) {
            return {
              changed: false,
            };
          }

          await transaction.organization.update(
            {
              where: {
                id: organization.id,
              },
              data: {
                name: parsedInput.data.name,
                timezone:
                  parsedInput.data.timezone,
              },
            },
          );

          for (const priority of serviceLevelPriorities) {
            const target =
              nextTargets[priority];

            await transaction.serviceLevelPolicy.upsert(
              {
                where: {
                  organizationId_priority: {
                    organizationId:
                      organization.id,
                    priority,
                  },
                },
                update: target,
                create: {
                  organizationId:
                    organization.id,
                  priority,
                  ...target,
                },
              },
            );
          }

          await transaction.organizationEvent.create(
            {
              data: {
                organizationId:
                  organization.id,
                actorId: workspace.user.id,
                action:
                  "WORKSPACE_SETTINGS_UPDATED",
                fromValue: {
                  name: organization.name,
                  timezone:
                    organization.timezone,
                  serviceLevels:
                    currentTargets,
                },
                toValue: {
                  name: parsedInput.data.name,
                  timezone:
                    parsedInput.data.timezone,
                  serviceLevels: nextTargets,
                },
                metadata: {
                  changedFields,
                },
              },
            },
          );

          return {
            changed: true,
          };
        },
        {
          isolationLevel: "Serializable",
        },
      );

    if (!result.changed) {
      return {
        status: "success",
        message:
          "No workspace setting changes were required.",
        fieldErrors: {},
      };
    }

    revalidatePath("/settings");
    revalidatePath("/");

    return {
      status: "success",
      message:
        "Workspace settings were updated.",
      fieldErrors: {},
    };
  } catch (error) {
    if (
      error instanceof
        WorkspaceSettingsActionError ||
      error instanceof AuthorizationError
    ) {
      return errorState(error.message);
    }

    console.error(
      "Failed to update workspace settings:",
      error,
    );

    return errorState(
      "DeskOps could not update workspace settings. Try again.",
    );
  }
}
