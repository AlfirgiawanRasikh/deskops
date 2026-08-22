import { z } from "zod";

export const createTicketActionSchema = z.object({
  requestType: z.enum(["Incident", "Service request"]),
  title: z
    .string()
    .trim()
    .min(5, "Title must contain at least 5 characters.")
    .max(120, "Title cannot exceed 120 characters."),
  description: z
    .string()
    .trim()
    .min(15, "Description must contain at least 15 characters.")
    .max(1200, "Description cannot exceed 1,200 characters."),
  requesterId: z
    .string()
    .trim()
    .min(1, "Select a requester.")
    .max(191, "Requester reference is invalid."),
  priority: z.enum(["Urgent", "High", "Normal", "Low"]),
  category: z.enum([
    "Network / VPN",
    "Access / Account",
    "Hardware / Device",
    "Software / License",
    "Security / Incident",
  ]),
  assetId: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === ""
        ? undefined
        : value,
    z
      .string()
      .trim()
      .min(1, "Asset reference is invalid.")
      .max(191, "Asset reference is invalid.")
      .optional(),
  ),
});

export const updateTicketStatusActionSchema = z.object({
  ticketId: z
    .string()
    .trim()
    .min(1, "Ticket reference is required.")
    .max(191, "Ticket reference is invalid."),
  status: z.enum([
    "Open",
    "Unassigned",
    "Investigating",
    "In progress",
    "Waiting requester",
    "Waiting approval",
    "Scheduled",
    "Resolved",
  ]),
});

export const updateTicketAssigneeActionSchema = z.object({
  ticketId: z
    .string()
    .trim()
    .min(1, "Ticket reference is required.")
    .max(191, "Ticket reference is invalid."),
  assigneeId: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === ""
        ? null
        : value,
    z
      .string()
      .trim()
      .min(1, "Assignee reference is invalid.")
      .max(191, "Assignee reference is invalid.")
      .nullable(),
  ),
});

export const addTicketReplyActionSchema = z.object({
  ticketId: z
    .string()
    .trim()
    .min(1, "Ticket reference is required.")
    .max(191, "Ticket reference is invalid."),
  body: z
    .string()
    .trim()
    .min(1, "Reply cannot be empty.")
    .max(2000, "Reply cannot exceed 2,000 characters."),
});

export const addTicketInternalNoteActionSchema = z.object({
  ticketId: z
    .string()
    .trim()
    .min(1, "Ticket reference is required.")
    .max(191, "Ticket reference is invalid."),
  body: z
    .string()
    .trim()
    .min(1, "Internal note cannot be empty.")
    .max(2000, "Internal note cannot exceed 2,000 characters."),
});

export type CreateTicketActionInput = z.infer<
  typeof createTicketActionSchema
>;

export type UpdateTicketStatusActionInput = z.infer<
  typeof updateTicketStatusActionSchema
>;

export type UpdateTicketAssigneeActionInput = z.infer<
  typeof updateTicketAssigneeActionSchema
>;

export type AddTicketReplyActionInput = z.infer<
  typeof addTicketReplyActionSchema
>;

export type AddTicketInternalNoteActionInput = z.infer<
  typeof addTicketInternalNoteActionSchema
>;
