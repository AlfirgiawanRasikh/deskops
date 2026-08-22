import assert from "node:assert/strict";
import {
  describe,
  test,
} from "node:test";

import { updateTicketAssigneeActionSchema } from "../src/features/tickets/schemas/ticket-actions";

describe("ticket assignment input", () => {
  test("accepts an assignee identifier", () => {
    const result =
      updateTicketAssigneeActionSchema.safeParse({
        ticketId: "ticket-a",
        assigneeId: "technician-a",
      });

    assert.equal(result.success, true);

    if (result.success) {
      assert.deepEqual(result.data, {
        ticketId: "ticket-a",
        assigneeId: "technician-a",
      });
    }
  });

  test("accepts null to return a ticket to the unassigned queue", () => {
    const result =
      updateTicketAssigneeActionSchema.safeParse({
        ticketId: "ticket-a",
        assigneeId: null,
      });

    assert.equal(result.success, true);
  });

  test("normalizes an empty select value to null", () => {
    const result =
      updateTicketAssigneeActionSchema.safeParse({
        ticketId: "ticket-a",
        assigneeId: "   ",
      });

    assert.equal(result.success, true);

    if (result.success) {
      assert.equal(
        result.data.assigneeId,
        null,
      );
    }
  });

  test("rejects an invalid ticket reference", () => {
    const result =
      updateTicketAssigneeActionSchema.safeParse({
        ticketId: "",
        assigneeId: null,
      });

    assert.equal(result.success, false);
  });
});
