import assert from "node:assert/strict";
import test from "node:test";

import {
  canReopenTicketResolution,
  getTicketReopenDeadline,
} from "../src/features/resolutions/utils/ticket-resolution-workflow";

const resolvedAt = new Date("2026-09-01T10:00:00.000Z");

test("calculates a seven-day ticket reopen deadline", () => {
  assert.equal(
    getTicketReopenDeadline(resolvedAt).toISOString(),
    "2026-09-08T10:00:00.000Z",
  );
});

test("requester can reopen through the exact deadline", () => {
  assert.equal(
    canReopenTicketResolution({
      actorId: "employee-a",
      requesterId: "employee-a",
      ticketStatus: "RESOLVED",
      resolutionStatus: "PENDING_CONFIRMATION",
      resolvedAt,
      now: new Date("2026-09-08T10:00:00.000Z"),
    }),
    true,
  );
});

test("reopen is denied after the deadline or to another actor", () => {
  assert.equal(
    canReopenTicketResolution({
      actorId: "employee-a",
      requesterId: "employee-a",
      ticketStatus: "RESOLVED",
      resolutionStatus: "PENDING_CONFIRMATION",
      resolvedAt,
      now: new Date("2026-09-08T10:00:00.001Z"),
    }),
    false,
  );
  assert.equal(
    canReopenTicketResolution({
      actorId: "employee-b",
      requesterId: "employee-a",
      ticketStatus: "RESOLVED",
      resolutionStatus: "PENDING_CONFIRMATION",
      resolvedAt,
      now: new Date("2026-09-02T10:00:00.000Z"),
    }),
    false,
  );
});

test("decided and non-resolved tickets cannot be reopened", () => {
  assert.equal(
    canReopenTicketResolution({
      actorId: "employee-a",
      requesterId: "employee-a",
      ticketStatus: "CLOSED",
      resolutionStatus: "CONFIRMED",
      resolvedAt,
      now: new Date("2026-09-02T10:00:00.000Z"),
    }),
    false,
  );
});
