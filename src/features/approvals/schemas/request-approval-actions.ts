import { z } from "zod";

const reference = z
  .string()
  .trim()
  .min(1, "A valid reference is required.")
  .max(191, "The submitted reference is invalid.");

const optionalNote = z.preprocess(
  (value) =>
    typeof value === "string" &&
    value.trim() === ""
      ? null
      : value,
  z
    .string()
    .trim()
    .max(500, "The note cannot exceed 500 characters.")
    .nullable()
    .optional(),
);

export const requestTicketApprovalActionSchema =
  z.object({
    ticketId: reference,
    approverId: reference,
    note: optionalNote,
  });

export const decideTicketApprovalActionSchema =
  z
    .object({
      approvalId: reference,
      decision: z.enum([
        "APPROVED",
        "REJECTED",
      ]),
      note: optionalNote,
    })
    .superRefine((input, context) => {
      if (
        input.decision === "REJECTED" &&
        (!input.note ||
          input.note.length < 5)
      ) {
        context.addIssue({
          code: "custom",
          path: ["note"],
          message:
            "A rejection reason of at least 5 characters is required.",
        });
      }
    });

export type RequestTicketApprovalActionInput =
  z.infer<
    typeof requestTicketApprovalActionSchema
  >;

export type DecideTicketApprovalActionInput =
  z.infer<
    typeof decideTicketApprovalActionSchema
  >;
