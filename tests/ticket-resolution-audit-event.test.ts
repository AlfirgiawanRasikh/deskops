import assert from "node:assert/strict";
import test from "node:test";

import { formatTicketAuditEvent } from "../src/features/audit/utils/audit-event-formatters";

const baseEvent = {
  actor: {
    id: "technician-a",
    name: "Rafi Akbar",
    email: "rafi@example.com",
  },
  ticket: {
    id: "ticket-a",
    number: 1051,
    type: "INCIDENT",
    title: "VPN disconnects",
  },
  createdAt: new Date("2026-09-11T08:00:00.000Z"),
};

test("formats a resolution without exposing its summary", () => {
  const record = formatTicketAuditEvent(
    {
      ...baseEvent,
      id: "event-a",
      action: "RESOLUTION_RECORDED",
      fromValue: "IN_PROGRESS",
      toValue: "RESOLVED",
      metadata: {
        source: "ticket-detail",
        category: "NETWORK_FIX",
        summary: "Sensitive diagnostic commands and internal addresses.",
      },
    },
    "UTC",
  );

  assert.equal(record.action, "Resolution recorded");
  assert.match(record.summary, /Network fix/);
  assert.doesNotMatch(record.summary, /diagnostic commands/);
});

test("formats confirmation and reopen without exposing the reason", () => {
  const confirmed = formatTicketAuditEvent(
    {
      ...baseEvent,
      id: "event-b",
      action: "RESOLUTION_CONFIRMED",
      fromValue: "RESOLVED",
      toValue: "CLOSED",
      metadata: { source: "ticket-detail" },
    },
    "UTC",
  );
  assert.equal(confirmed.action, "Resolution confirmed");

  const reopened = formatTicketAuditEvent(
    {
      ...baseEvent,
      id: "event-c",
      action: "TICKET_REOPENED",
      fromValue: "RESOLVED",
      toValue: "IN_PROGRESS",
      metadata: {
        source: "ticket-detail",
        reason: "Sensitive customer detail.",
      },
    },
    "UTC",
  );
  assert.equal(reopened.action, "Ticket reopened");
  assert.doesNotMatch(reopened.summary, /customer detail/);
});
