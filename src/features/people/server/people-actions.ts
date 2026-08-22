"use server";

import { revalidatePath } from "next/cache";

import {
  canAssignMembershipRole,
  canManageMembership,
} from "@/features/people/policies/people-authorization";
import { updateMembershipActionSchema } from "@/features/people/schemas/people-actions";
import type { UpdateMembershipActionState } from "@/features/people/types/people-actions";
import { requireWorkspaceSession } from "@/features/auth/server/workspace-session";
import { prisma } from "@/lib/prisma";

class MembershipActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MembershipActionError";
  }
}

function createErrorState(
  message: string,
): UpdateMembershipActionState {
  return {
    status: "error",
    message,
    fieldErrors: {},
  };
}

export async function updateMembershipAction(
  _previousState: UpdateMembershipActionState,
  formData: FormData,
): Promise<UpdateMembershipActionState> {
  const workspace =
    await requireWorkspaceSession();

  const parsedInput =
    updateMembershipActionSchema.safeParse({
      membershipId: formData.get(
        "membershipId",
      ),
      role: formData.get("role"),
      status: formData.get("status"),
      department: formData.get(
        "department",
      ),
    });

  if (!parsedInput.success) {
    return {
      status: "error",
      message:
        "Review the highlighted membership details.",
      fieldErrors:
        parsedInput.error.flatten()
          .fieldErrors,
    };
  }

  const {
    membershipId,
    role,
    status,
    department,
  } = parsedInput.data;

  try {
    const result =
      await prisma.$transaction(
        async (transaction) => {
          const targetMembership =
            await transaction.membership.findFirst(
              {
                where: {
                  id: membershipId,
                  organizationId:
                    workspace.organization.id,
                },
                select: {
                  id: true,
                  userId: true,
                  role: true,
                  status: true,
                  department: true,
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            );

          if (!targetMembership) {
            throw new MembershipActionError(
              "The membership could not be found in this workspace.",
            );
          }

          if (
            targetMembership.status ===
            "INVITED"
          ) {
            throw new MembershipActionError(
              "Invited memberships cannot be edited until the invitation workflow is available.",
            );
          }

          const isSelf =
            targetMembership.userId ===
            workspace.user.id;

          if (
            !canManageMembership({
              actorRole:
                workspace.membership.role,
              targetRole:
                targetMembership.role,
              isSelf,
            })
          ) {
            throw new MembershipActionError(
              isSelf
                ? "You cannot modify your own workspace membership."
                : "You do not have permission to manage this membership.",
            );
          }

          if (
            !canAssignMembershipRole(
              workspace.membership.role,
              role,
            )
          ) {
            throw new MembershipActionError(
              "You cannot assign the selected role.",
            );
          }

          const removesActiveOwner =
            targetMembership.role ===
              "OWNER" &&
            targetMembership.status ===
              "ACTIVE" &&
            (role !== "OWNER" ||
              status !== "ACTIVE");

          if (removesActiveOwner) {
            const otherActiveOwnerCount =
              await transaction.membership.count(
                {
                  where: {
                    organizationId:
                      workspace.organization.id,
                    role: "OWNER",
                    status: "ACTIVE",
                    id: {
                      not: targetMembership.id,
                    },
                  },
                },
              );

            if (
              otherActiveOwnerCount === 0
            ) {
              throw new MembershipActionError(
                "This workspace must retain at least one active Owner.",
              );
            }
          }

          const hasChanges =
            targetMembership.role !== role ||
            targetMembership.status !==
              status ||
            targetMembership.department !==
              department;

          if (!hasChanges) {
            return {
              changed: false,
              memberName:
                targetMembership.user.name,
            };
          }

          await transaction.membership.update(
            {
              where: {
                id: targetMembership.id,
              },
              data: {
                role,
                status,
                department,
              },
            },
          );

          await transaction.membershipEvent.create(
            {
              data: {
                membershipId:
                  targetMembership.id,
                actorId:
                  workspace.user.id,
                action:
                  "MEMBERSHIP_UPDATED",
                fromValue: {
                  role:
                    targetMembership.role,
                  status:
                    targetMembership.status,
                  department:
                    targetMembership.department,
                },
                toValue: {
                  role,
                  status,
                  department,
                },
                metadata: {
                  organizationId:
                    workspace.organization.id,
                  targetUserId:
                    targetMembership.userId,
                },
              },
            },
          );

          return {
            changed: true,
            memberName:
              targetMembership.user.name,
          };
        },
        {
          isolationLevel: "Serializable",
        },
      );

    if (result.changed) {
      revalidatePath("/people");

      return {
        status: "success",
        message: `${result.memberName}'s membership was updated.`,
        fieldErrors: {},
      };
    }

    return {
      status: "success",
      message: "No membership changes were required.",
      fieldErrors: {},
    };
  } catch (error) {
    if (
      error instanceof
      MembershipActionError
    ) {
      return createErrorState(error.message);
    }

    console.error(
      "Failed to update workspace membership:",
      error,
    );

    return createErrorState(
      "DeskOps could not update this membership. Try again.",
    );
  }
}