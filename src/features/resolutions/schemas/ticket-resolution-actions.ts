import { z } from "zod";

const reference = z
  .string()
  .trim()
  .min(1, "A valid reference is required.")
  .max(191, "The submitted reference is invalid.");

export const ticketResolutionCategories = [
  "SOFTWARE_CONFIGURATION",
  "ACCOUNT_ACCESS",
  "HARDWARE_REPAIR",
  "NETWORK_FIX",
  "SECURITY_REMEDIATION",
  "USER_GUIDANCE",
  "NO_FAULT_FOUND",
  "OTHER",
] as const;

export const resolveTicketActionSchema = z.object({
  ticketId: reference,
  category: z.enum(ticketResolutionCategories),
  summary: z
    .string()
    .trim()
    .min(20, "Resolution summary must contain at least 20 characters.")
    .max(2000, "Resolution summary cannot exceed 2,000 characters."),
});

export const confirmTicketResolutionActionSchema = z.object({
  resolutionId: reference,
});

export const reopenTicketActionSchema = z.object({
  resolutionId: reference,
  reason: z
    .string()
    .trim()
    .min(10, "Reopen reason must contain at least 10 characters.")
    .max(1000, "Reopen reason cannot exceed 1,000 characters."),
});

export type ResolveTicketActionInput = z.infer<
  typeof resolveTicketActionSchema
>;

export type ConfirmTicketResolutionActionInput = z.infer<
  typeof confirmTicketResolutionActionSchema
>;

export type ReopenTicketActionInput = z.infer<
  typeof reopenTicketActionSchema
>;
