import { z } from "zod";

import { workspaceTimeZones } from "@/features/settings/constants/service-level-policies";

const targetMinutesSchema = z.coerce
  .number({
    error:
      "Enter a valid number of minutes.",
  })
  .int("Minutes must be a whole number.")
  .min(1, "Minutes must be at least 1.")
  .max(
    43_200,
    "Minutes cannot exceed 30 days.",
  );

export const updateWorkspaceSettingsSchema =
  z
    .object({
      name: z
        .string()
        .trim()
        .min(
          2,
          "Workspace name must contain at least 2 characters.",
        )
        .max(
          100,
          "Workspace name must contain no more than 100 characters.",
        ),
      timezone: z.enum(
        workspaceTimeZones,
        {
          error:
            "Select a supported timezone.",
        },
      ),
      urgentFirstResponseMinutes:
        targetMinutesSchema,
      urgentResolutionMinutes:
        targetMinutesSchema,
      highFirstResponseMinutes:
        targetMinutesSchema,
      highResolutionMinutes:
        targetMinutesSchema,
      normalFirstResponseMinutes:
        targetMinutesSchema,
      normalResolutionMinutes:
        targetMinutesSchema,
      lowFirstResponseMinutes:
        targetMinutesSchema,
      lowResolutionMinutes:
        targetMinutesSchema,
    })
    .superRefine((value, context) => {
      const targets = [
        {
          firstResponse:
            value.urgentFirstResponseMinutes,
          resolution:
            value.urgentResolutionMinutes,
          path: "urgentResolutionMinutes",
        },
        {
          firstResponse:
            value.highFirstResponseMinutes,
          resolution:
            value.highResolutionMinutes,
          path: "highResolutionMinutes",
        },
        {
          firstResponse:
            value.normalFirstResponseMinutes,
          resolution:
            value.normalResolutionMinutes,
          path: "normalResolutionMinutes",
        },
        {
          firstResponse:
            value.lowFirstResponseMinutes,
          resolution:
            value.lowResolutionMinutes,
          path: "lowResolutionMinutes",
        },
      ] as const;

      for (const target of targets) {
        if (
          target.resolution <
          target.firstResponse
        ) {
          context.addIssue({
            code: "custom",
            message:
              "Resolution target cannot be shorter than first response target.",
            path: [target.path],
          });
        }
      }
    });

export type UpdateWorkspaceSettingsInput =
  z.infer<
    typeof updateWorkspaceSettingsSchema
  >;
