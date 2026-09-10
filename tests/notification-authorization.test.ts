import assert from "node:assert/strict";
import test from "node:test";

import {
  canReceiveNewTicketNotification,
  getNotificationReadScope,
  getTicketNotificationRecipients,
} from "../src/features/notifications/policies/notification-authorization";

test("active operational members receive new employee ticket notifications", () => {
  for (const role of [
    "OWNER",
    "ADMIN",
    "MANAGER",
    "TECHNICIAN",
  ] as const) {
    assert.equal(
      canReceiveNewTicketNotification({
        role,
        status: "ACTIVE",
        userId: `${role.toLowerCase()}-a`,
        actorId: "employee-a",
      }),
      true,
    );
  }
});

test("employees, inactive members, and the actor do not receive new ticket notifications", () => {
  assert.equal(
    canReceiveNewTicketNotification({
      role: "EMPLOYEE",
      status: "ACTIVE",
      userId: "employee-b",
      actorId: "employee-a",
    }),
    false,
  );

  assert.equal(
    canReceiveNewTicketNotification({
      role: "TECHNICIAN",
      status: "SUSPENDED",
      userId: "technician-a",
      actorId: "employee-a",
    }),
    false,
  );

  assert.equal(
    canReceiveNewTicketNotification({
      role: "OWNER",
      status: "ACTIVE",
      userId: "owner-a",
      actorId: "owner-a",
    }),
    false,
  );
});

test("notification reads are restricted by organization and recipient", () => {
  assert.deepEqual(
    getNotificationReadScope({
      organizationId:
        "organization-a",
      userId: "user-a",
    }),
    {
      organizationId:
        "organization-a",
      recipientId: "user-a",
    },
  );
});

test("ticket assignments notify only the new assignee", () => {
  assert.deepEqual(
    getTicketNotificationRecipients({
      event: "ASSIGNED",
      actorId: "manager-a",
      requesterId: "employee-a",
      assigneeId: "technician-a",
    }),
    ["technician-a"],
  );
});

test("actors never receive notifications for their own assignment action", () => {
  assert.deepEqual(
    getTicketNotificationRecipients({
      event: "ASSIGNED",
      actorId: "technician-a",
      requesterId: "employee-a",
      assigneeId: "technician-a",
    }),
    [],
  );
});

test("status changes notify requester and assignee without duplicates", () => {
  assert.deepEqual(
    getTicketNotificationRecipients({
      event: "STATUS_CHANGED",
      actorId: "manager-a",
      requesterId: "employee-a",
      assigneeId: "technician-a",
    }),
    ["employee-a", "technician-a"],
  );

  assert.deepEqual(
    getTicketNotificationRecipients({
      event: "STATUS_CHANGED",
      actorId: "manager-a",
      requesterId: "same-user",
      assigneeId: "same-user",
    }),
    ["same-user"],
  );
});

test("public replies notify the other ticket participants", () => {
  assert.deepEqual(
    getTicketNotificationRecipients({
      event: "PUBLIC_REPLY",
      actorId: "employee-a",
      requesterId: "employee-a",
      assigneeId: "technician-a",
    }),
    ["technician-a"],
  );

  assert.deepEqual(
    getTicketNotificationRecipients({
      event: "PUBLIC_REPLY",
      actorId: "technician-a",
      requesterId: "employee-a",
      assigneeId: "technician-a",
    }),
    ["employee-a"],
  );
});

test("internal notes remain limited to the assignee", () => {
  assert.deepEqual(
    getTicketNotificationRecipients({
      event: "INTERNAL_NOTE",
      actorId: "manager-a",
      requesterId: "employee-a",
      assigneeId: "technician-a",
    }),
    ["technician-a"],
  );
});
