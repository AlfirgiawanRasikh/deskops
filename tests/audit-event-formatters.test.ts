import assert from "node:assert/strict";
import test from "node:test";

import {
  formatMembershipAuditEvent,
  formatTicketAuditEvent,
  formatWorkspaceAuditEvent,
} from "../src/features/audit/utils/audit-event-formatters";

const actor = {
  id: "user-1",
  name: "Owner Example",
  email: "owner@example.com",
};

test("formats ticket status events with a scoped ticket link", () => {
  const event = formatTicketAuditEvent(
    {
      id: "event-1",
      action: "STATUS_CHANGED",
      fromValue: "OPEN",
      toValue: "IN_PROGRESS",
      metadata: {
        source: "ticket-detail",
      },
      createdAt: new Date(
        "2026-09-10T10:00:00.000Z",
      ),
      actor,
      ticket: {
        id: "ticket-1",
        number: 1046,
        type: "INCIDENT",
        title: "VPN unavailable",
      },
    },
    "UTC",
  );

  assert.equal(
    event.action,
    "Status changed",
  );
  assert.equal(
    event.summary,
    "Status: Open → In progress.",
  );
  assert.equal(
    event.resource.label,
    "INC-1046 · VPN unavailable",
  );
  assert.equal(
    event.resource.href,
    "/tickets/ticket-1",
  );
  assert.equal(
    event.source,
    "Ticket detail",
  );
});

test("does not expose internal note content in an audit event", () => {
  const event = formatTicketAuditEvent(
    {
      id: "event-2",
      action: "COMMENT_ADDED",
      fromValue: null,
      toValue: "INTERNAL",
      metadata: {
        commentId: "comment-1",
        source: "ticket-detail",
        body: "Sensitive note content",
      },
      createdAt: new Date(
        "2026-09-10T10:01:00.000Z",
      ),
      actor,
      ticket: {
        id: "ticket-1",
        number: 1046,
        type: "INCIDENT",
        title: "VPN unavailable",
      },
    },
    "UTC",
  );

  assert.equal(
    event.action,
    "Internal note added",
  );
  assert.doesNotMatch(
    event.summary,
    /Sensitive note content/,
  );
});

test("formats changed membership fields without raw metadata", () => {
  const event =
    formatMembershipAuditEvent(
      {
        id: "event-3",
        action: "MEMBERSHIP_UPDATED",
        fromValue: {
          role: "EMPLOYEE",
          status: "ACTIVE",
          department: "Finance",
        },
        toValue: {
          role: "TECHNICIAN",
          status: "ACTIVE",
          department: "IT",
        },
        metadata: {
          targetUserId: "user-2",
        },
        createdAt: new Date(
          "2026-09-10T10:02:00.000Z",
        ),
        actor,
        membership: {
          id: "membership-2",
          user: {
            name: "Member Example",
            email:
              "member@example.com",
          },
        },
      },
      "UTC",
    );

  assert.match(
    event.summary,
    /Role: Employee → Technician/,
  );
  assert.match(
    event.summary,
    /Department: Finance → IT/,
  );
  assert.equal(
    event.resource.href,
    "/people?member=membership-2",
  );
});

test("labels missing actors without guessing their identity", () => {
  const event =
    formatWorkspaceAuditEvent(
      {
        id: "event-4",
        action:
          "WORKSPACE_SETTINGS_UPDATED",
        fromValue: null,
        toValue: null,
        metadata: {
          changedFields: [
            "timezone",
            "urgent SLA",
          ],
        },
        createdAt: new Date(
          "2026-09-10T10:03:00.000Z",
        ),
        actor: null,
        organization: {
          name: "Nusantara Systems",
        },
      },
      "UTC",
    );

  assert.equal(
    event.actor.name,
    "System or removed user",
  );
  assert.equal(
    event.summary,
    "Updated timezone, urgent SLA.",
  );
});
