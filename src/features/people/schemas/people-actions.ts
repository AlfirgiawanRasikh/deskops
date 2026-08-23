import { z } from "zod";

import { membershipRoles } from "@/features/people/policies/people-authorization";

export const editableMembershipStatuses = [
  "ACTIVE",
  "SUSPENDED",
] as const;

export const updateMembershipActionSchema =
  z.object({
    membershipId: z
      .string()
      .trim()
      .min(1, "Membership is required.")
      .max(191, "Membership identifier is invalid."),
    role: z.enum(membershipRoles),
    status: z.enum(
      editableMembershipStatuses,
    ),
    department: z
      .string()
      .trim()
      .max(
        80,
        "Department must contain no more than 80 characters.",
      )
      .transform((value) =>
        value.length > 0 ? value : null,
      ),
  });

export type UpdateMembershipActionInput =
  z.infer<
    typeof updateMembershipActionSchema
  >;