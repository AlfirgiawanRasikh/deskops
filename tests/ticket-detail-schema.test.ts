import assert from "node:assert/strict";
import {
  describe,
  test,
} from "node:test";

import {
  addTicketInternalNoteActionSchema,
  addTicketReplyActionSchema,
} from "../src/features/tickets/schemas/ticket-actions";

describe("ticket conversation input", () => {
  test("accepts a public reply", () => {
    const result =
      addTicketReplyActionSchema.safeParse({
        ticketId: "ticket-a",
        body: "The VPN profile has been updated.",
      });

    assert.equal(result.success, true);
  });

  test("accepts an internal note", () => {
    const result =
      addTicketInternalNoteActionSchema.safeParse({
        ticketId: "ticket-a",
        body: "Waiting for the network team review.",
      });

    assert.equal(result.success, true);
  });

  test("rejects an empty internal note", () => {
    const result =
      addTicketInternalNoteActionSchema.safeParse({
        ticketId: "ticket-a",
        body: "   ",
      });

    assert.equal(result.success, false);
  });

  test("rejects a message longer than 2,000 characters", () => {
    const result =
      addTicketReplyActionSchema.safeParse({
        ticketId: "ticket-a",
        body: "x".repeat(2001),
      });

    assert.equal(result.success, false);
  });
});
