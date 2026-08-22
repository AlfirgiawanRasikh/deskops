import { z } from "zod";

const assetIdSchema = z
  .string()
  .trim()
  .min(
    1,
    "Asset reference is required.",
  )
  .max(
    191,
    "Asset reference is invalid.",
  );

export const updateAssetStatusActionSchema =
  z.object({
    assetId: assetIdSchema,
    status: z.enum([
      "IN_STOCK",
      "IN_REPAIR",
      "RETIRED",
      "LOST",
    ]),
  });

export const updateAssetAssignmentActionSchema =
  z.object({
    assetId: assetIdSchema,
    assignedToUserId: z.preprocess(
      (value) =>
        typeof value === "string" &&
        value.trim() === ""
          ? null
          : value,
      z
        .string()
        .trim()
        .min(
          1,
          "Member reference is invalid.",
        )
        .max(
          191,
          "Member reference is invalid.",
        )
        .nullable(),
    ),
  });

export type UpdateAssetStatusActionInput =
  z.infer<
    typeof updateAssetStatusActionSchema
  >;

export type UpdateAssetAssignmentActionInput =
  z.infer<
    typeof updateAssetAssignmentActionSchema
  >;