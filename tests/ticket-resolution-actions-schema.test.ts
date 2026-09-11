import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmTicketResolutionActionSchema,
  reopenTicketActionSchema,
  resolveTicketActionSchema,
} from "../src/features/resolutions/schemas/ticket-resolution-actions";
import { updateTicketStatusActionSchema } from "../src/features/tickets/schemas/ticket-actions";

test("accepts and trims a complete ticket resolution", () => {
  const result = resolveTicketActionSchema.parse({
    ticketId: " ticket-a ",
    category: "NETWORK_FIX",
    summary: " The VPN route was corrected and verified successfully. ",
  });

  assert.deepEqual(result, {
    ticketId: "ticket-a",
    category: "NETWORK_FIX",
    summary: "The VPN route was corrected and verified successfully.",
  });
});

test("rejects short resolution summaries and unsupported categories", () => {
  assert.equal(
    resolveTicketActionSchema.safeParse({
      ticketId: "ticket-a",
      category: "NETWORK_FIX",
      summary: "Fixed.",
    }).success,
    false,
  );
  assert.equal(
    resolveTicketActionSchema.safeParse({
      ticketId: "ticket-a",
      category: "MAGIC_FIX",
      summary: "The issue was fixed and verified with the requester.",
    }).success,
    false,
  );
});

test("accepts confirmation and requires a meaningful reopen reason", () => {
  assert.equal(
    confirmTicketResolutionActionSchema.safeParse({
      resolutionId: "resolution-a",
    }).success,
    true,
  );
  assert.equal(
    reopenTicketActionSchema.safeParse({
      resolutionId: "resolution-a",
      reason: "Still bad",
    }).success,
    false,
  );
  assert.deepEqual(
    reopenTicketActionSchema.parse({
      resolutionId: " resolution-a ",
      reason: " The VPN still disconnects every few minutes. ",
    }),
    {
      resolutionId: "resolution-a",
      reason: "The VPN still disconnects every few minutes.",
    },
  );
});

test("resolved cannot be selected as a manual ticket status", () => {
  assert.equal(
    updateTicketStatusActionSchema.safeParse({
      ticketId: "ticket-a",
      status: "Resolved",
    }).success,
    false,
  );
});
