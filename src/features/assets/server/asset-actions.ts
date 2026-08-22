"use server";

import { revalidatePath } from "next/cache";

import {
  AuthorizationError,
  getAuthorizedWorkspace,
} from "@/features/auth/server/authorization";
import {
  canAssignAssets,
  canUpdateAssetStatus,
} from "@/features/assets/policies/asset-authorization";
import {
  type UpdateAssetAssignmentActionInput,
  type UpdateAssetStatusActionInput,
  updateAssetAssignmentActionSchema,
  updateAssetStatusActionSchema,
} from "@/features/assets/schemas/asset-actions";
import type { AssetActionResult } from "@/features/assets/types/asset-actions";
import { prisma } from "@/lib/prisma";

class AssetMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetMutationError";
  }
}

function firstValidationMessage(
  issues: Array<{
    message: string;
  }>,
) {
  return (
    issues[0]?.message ??
    "The submitted asset data is invalid."
  );
}

function mutationFailure(
  error: unknown,
): AssetActionResult {
  if (
    error instanceof AssetMutationError ||
    error instanceof AuthorizationError
  ) {
    return {
      success: false,
      message: error.message,
    };
  }

  console.error(
    "DeskOps asset mutation failed:",
    error,
  );

  return {
    success: false,
    message:
      "DeskOps could not complete this asset operation. Please try again.",
  };
}

function refreshAssetViews() {
  revalidatePath("/assets");
  revalidatePath("/");
}

export async function updateAssetStatusAction(
  rawInput: UpdateAssetStatusActionInput,
): Promise<AssetActionResult> {
  const validation =
    updateAssetStatusActionSchema.safeParse(
      rawInput,
    );

  if (!validation.success) {
    return {
      success: false,
      message: firstValidationMessage(
        validation.error.issues,
      ),
    };
  }

  try {
    const workspace =
      await getAuthorizedWorkspace();

    if (
      !canUpdateAssetStatus(
        workspace.membership.role,
      )
    ) {
      throw new AuthorizationError(
        "Your current role cannot update asset status.",
      );
    }

    const input = validation.data;

    const result =
      await prisma.$transaction(
        async (transaction) => {
          const asset =
            await transaction.asset.findFirst({
              where: {
                id: input.assetId,
                organizationId:
                  workspace.organization.id,
              },
              select: {
                id: true,
                status: true,
                assignedToId: true,
                assignedTo: {
                  select: {
                    name: true,
                  },
                },
              },
            });

          if (!asset) {
            throw new AssetMutationError(
              "The asset could not be found in this workspace.",
            );
          }

          const shouldClearAssignment =
            input.status === "IN_STOCK" ||
            input.status === "RETIRED";

          const nextAssignedToId =
            shouldClearAssignment
              ? null
              : asset.assignedToId;

          if (
            asset.status === input.status &&
            asset.assignedToId ===
              nextAssignedToId
          ) {
            return {
              changed: false,
            };
          }

          await transaction.asset.update({
            where: {
              id: asset.id,
            },
            data: {
              status: input.status,
              assignedToId:
                nextAssignedToId,
            },
          });

          await transaction.assetEvent.create({
            data: {
              assetId: asset.id,
              actorId: workspace.user.id,
              action: "STATUS_CHANGED",
              fromValue: asset.status,
              toValue: input.status,
              metadata: {
                assignmentCleared:
                  shouldClearAssignment &&
                  Boolean(
                    asset.assignedToId,
                  ),
                previousAssigneeId:
                  asset.assignedToId,
                previousAssigneeName:
                  asset.assignedTo?.name ??
                  null,
              },
            },
          });

          return {
            changed: true,
          };
        },
      );

    if (!result.changed) {
      return {
        success: true,
        message:
          "The asset already has this status.",
      };
    }

    refreshAssetViews();

    return {
      success: true,
      message:
        "Asset status updated successfully.",
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function updateAssetAssignmentAction(
  rawInput: UpdateAssetAssignmentActionInput,
): Promise<AssetActionResult> {
  const validation =
    updateAssetAssignmentActionSchema.safeParse(
      rawInput,
    );

  if (!validation.success) {
    return {
      success: false,
      message: firstValidationMessage(
        validation.error.issues,
      ),
    };
  }

  try {
    const workspace =
      await getAuthorizedWorkspace();

    if (
      !canAssignAssets(
        workspace.membership.role,
      )
    ) {
      throw new AuthorizationError(
        "Your current role cannot assign assets.",
      );
    }

    const input = validation.data;

    const result =
      await prisma.$transaction(
        async (transaction) => {
          const asset =
            await transaction.asset.findFirst({
              where: {
                id: input.assetId,
                organizationId:
                  workspace.organization.id,
              },
              select: {
                id: true,
                status: true,
                assignedToId: true,
                assignedTo: {
                  select: {
                    name: true,
                  },
                },
              },
            });

          if (!asset) {
            throw new AssetMutationError(
              "The asset could not be found in this workspace.",
            );
          }

          let nextAssignee: {
            id: string;
            name: string;
          } | null = null;

          if (input.assignedToUserId) {
            if (
              asset.status !== "IN_STOCK" &&
              asset.status !== "ASSIGNED"
            ) {
              throw new AssetMutationError(
                "Only in-stock or assigned assets can be assigned to a member.",
              );
            }

            const membership =
              await transaction.membership.findUnique({
                where: {
                  organizationId_userId: {
                    organizationId:
                      workspace.organization.id,
                    userId:
                      input.assignedToUserId,
                  },
                },
                select: {
                  status: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              });

            if (
              !membership ||
              membership.status !== "ACTIVE"
            ) {
              throw new AssetMutationError(
                "The selected assignee is not an active workspace member.",
              );
            }

            nextAssignee =
              membership.user;
          }

          if (
            asset.assignedToId ===
            (nextAssignee?.id ?? null)
          ) {
            return {
              changed: false,
            };
          }

          const nextStatus = nextAssignee
            ? "ASSIGNED"
            : asset.status === "ASSIGNED"
              ? "IN_STOCK"
              : asset.status;

          await transaction.asset.update({
            where: {
              id: asset.id,
            },
            data: {
              assignedToId:
                nextAssignee?.id ?? null,
              status: nextStatus,
            },
          });

          await transaction.assetEvent.create({
            data: {
              assetId: asset.id,
              actorId: workspace.user.id,
              action: "ASSIGNMENT_CHANGED",
              fromValue:
                asset.assignedTo?.name ??
                null,
              toValue:
                nextAssignee?.name ?? null,
              metadata: {
                previousAssigneeId:
                  asset.assignedToId,
                nextAssigneeId:
                  nextAssignee?.id ?? null,
                previousStatus:
                  asset.status,
                nextStatus,
              },
            },
          });

          return {
            changed: true,
          };
        },
      );

    if (!result.changed) {
      return {
        success: true,
        message:
          "The asset already has this assignment.",
      };
    }

    refreshAssetViews();

    return {
      success: true,
      message:
        "Asset assignment updated successfully.",
    };
  } catch (error) {
    return mutationFailure(error);
  }
}