import assert from "node:assert/strict";
import test from "node:test";

import {
  decideTicketApprovalActionSchema,
  requestTicketApprovalActionSchema,
} from "../src/features/approvals/schemas/request-approval-actions";
import { updateTicketStatusActionSchema } from "../src/features/tickets/schemas/ticket-actions";

test("accepts and trims an approval request", () => {
  const result =
    requestTicketApprovalActionSchema.parse({
      ticketId: " ticket-a ",
      approverId: " owner-a ",
      note: " Please approve access. ",
    });

  assert.deepEqual(result, {
    ticketId: "ticket-a",
    approverId: "owner-a",
    note: "Please approve access.",
  });
});

test("normalizes an empty approval request note", () => {
  const result =
    requestTicketApprovalActionSchema.parse({
      ticketId: "ticket-a",
      approverId: "owner-a",
      note: "   ",
    });

  assert.equal(result.note, null);
});

test("accepts an approval without a decision note", () => {
  assert.equal(
    decideTicketApprovalActionSchema.safeParse({
      approvalId: "approval-a",
      decision: "APPROVED",
      note: "",
    }).success,
    true,
  );
});

test("requires a reason when rejecting a service request", () => {
  assert.equal(
    decideTicketApprovalActionSchema.safeParse({
      approvalId: "approval-a",
      decision: "REJECTED",
      note: "No",
    }).success,
    false,
  );
  assert.equal(
    decideTicketApprovalActionSchema.safeParse({
      approvalId: "approval-a",
      decision: "REJECTED",
      note: "Budget is not available.",
    }).success,
    true,
  );
});

test("rejects unsupported approval decisions", () => {
  assert.equal(
    decideTicketApprovalActionSchema.safeParse({
      approvalId: "approval-a",
      decision: "CANCELED",
      note: "Canceled externally.",
    }).success,
    false,
  );
});

test("waiting approval cannot be selected as a manual ticket status", () => {
  assert.equal(
    updateTicketStatusActionSchema.safeParse({
      ticketId: "ticket-a",
      status: "Waiting approval",
    }).success,
    false,
  );
});
