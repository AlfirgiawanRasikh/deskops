import assert from "node:assert/strict";
import test from "node:test";

import { formatTicketAuditEvent } from "../src/features/audit/utils/audit-event-formatters";

const baseEvent = {
  actor: {
    id: "manager-a",
    name: "Maya Sari",
    email: "maya@example.com",
  },
  ticket: {
    id: "ticket-a",
    number: 1050,
    type: "SERVICE_REQUEST",
    title: "Request design software",
  },
  createdAt: new Date(
    "2026-09-10T10:00:00.000Z",
  ),
};

test("formats an approval request without exposing its note", () => {
  const record = formatTicketAuditEvent(
    {
      ...baseEvent,
      id: "event-a",
      action: "APPROVAL_REQUESTED",
      fromValue: "IN_PROGRESS",
      toValue: "Alfirgiawan Rasikh",
      metadata: {
        source: "ticket-detail",
        requestNote:
          "Contains a private procurement explanation.",
      },
    },
    "UTC",
  );

  assert.equal(
    record.action,
    "Approval requested",
  );
  assert.match(
    record.summary,
    /Alfirgiawan Rasikh/,
  );
  assert.match(
    record.summary,
    /In progress → Waiting approval/,
  );
  assert.doesNotMatch(
    record.summary,
    /private procurement explanation/,
  );
});

test("formats approval decisions and resulting ticket status", () => {
  const approved = formatTicketAuditEvent(
    {
      ...baseEvent,
      id: "event-b",
      action: "APPROVAL_DECIDED",
      fromValue: "PENDING",
      toValue: "APPROVED",
      metadata: {
        source: "ticket-detail",
        nextTicketStatus: "IN_PROGRESS",
      },
    },
    "UTC",
  );

  assert.equal(
    approved.action,
    "Service request approved",
  );
  assert.equal(
    approved.summary,
    "Approval: Pending → Approved. Ticket status: Waiting approval → In progress.",
  );
});
