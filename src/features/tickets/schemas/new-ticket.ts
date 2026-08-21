import { z } from "zod";

export const newTicketSchema = z.object({
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
  requester: z
    .string()
    .trim()
    .min(2, "Requester name is required.")
    .max(80, "Requester name cannot exceed 80 characters."),
  department: z.string().min(1, "Select a department."),
  priority: z.enum(["Urgent", "High", "Normal", "Low"]),
  category: z.string().min(1, "Select a category."),
  asset: z
    .string()
    .trim()
    .max(80, "Asset reference cannot exceed 80 characters."),
});

export type NewTicketInput = z.infer<typeof newTicketSchema>;