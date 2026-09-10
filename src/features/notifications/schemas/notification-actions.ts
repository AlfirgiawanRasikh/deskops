import { z } from "zod";

const notificationIdSchema = z
  .string()
  .trim()
  .min(1, "Notification reference is required.")
  .max(64, "Notification reference is invalid.");

export const notificationActionSchema =
  z.discriminatedUnion("action", [
    z.object({
      action: z.literal("read"),
      notificationId:
        notificationIdSchema,
    }),
    z.object({
      action: z.literal("read-all"),
    }),
    z.object({
      action: z.literal("clear-read"),
    }),
  ]);

export type NotificationActionInput =
  z.infer<
    typeof notificationActionSchema
  >;
