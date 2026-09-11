import assert from "node:assert/strict";
import test from "node:test";

import {
  canConfirmTicketResolution,
  canResolveTicket,
  getResolutionNotificationRecipients,
} from "../src/features/resolutions/policies/ticket-resolution-authorization";

test("workspace management roles can resolve organization tickets", () => {
  for (const role of ["OWNER", "ADMIN", "MANAGER"] as const) {
    assert.equal(
      canResolveTicket({ role, actorId: "manager-a", assigneeId: null }),
      true,
    );
  }
});

test("technicians resolve only their assigned tickets", () => {
  assert.equal(
    canResolveTicket({
      role: "TECHNICIAN",
      actorId: "technician-a",
      assigneeId: "technician-a",
    }),
    true,
  );
  assert.equal(
    canResolveTicket({
      role: "TECHNICIAN",
      actorId: "technician-a",
      assigneeId: "technician-b",
    }),
    false,
  );
  assert.equal(
    canResolveTicket({
      role: "EMPLOYEE",
      actorId: "employee-a",
      assigneeId: "employee-a",
    }),
    false,
  );
});

test("only the requester confirms a pending resolved ticket", () => {
  assert.equal(
    canConfirmTicketResolution({
      actorId: "employee-a",
      requesterId: "employee-a",
      ticketStatus: "RESOLVED",
      resolutionStatus: "PENDING_CONFIRMATION",
    }),
    true,
  );
  assert.equal(
    canConfirmTicketResolution({
      actorId: "employee-b",
      requesterId: "employee-a",
      ticketStatus: "RESOLVED",
      resolutionStatus: "PENDING_CONFIRMATION",
    }),
    false,
  );
  assert.equal(
    canConfirmTicketResolution({
      actorId: "employee-a",
      requesterId: "employee-a",
      ticketStatus: "CLOSED",
      resolutionStatus: "CONFIRMED",
    }),
    false,
  );
});

test("resolution notifications are deduplicated and never sent to the actor", () => {
  assert.deepEqual(
    getResolutionNotificationRecipients({
      event: "RESOLVED",
      actorId: "technician-a",
      requesterId: "employee-a",
      assigneeId: "technician-a",
      resolvedById: "technician-a",
    }),
    ["employee-a"],
  );

  assert.deepEqual(
    getResolutionNotificationRecipients({
      event: "REOPENED",
      actorId: "employee-a",
      requesterId: "employee-a",
      assigneeId: "technician-a",
      resolvedById: "technician-a",
    }),
    ["technician-a"],
  );
});
