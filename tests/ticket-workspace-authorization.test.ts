import assert from "node:assert/strict";
import test from "node:test";

import {
  canViewTicketWorkspace,
  getTicketWorkspaceScope,
} from "../src/features/tickets/policies/ticket-workspace-authorization";

test("organization operations roles can view the complete ticket workspace", () => {
  for (const role of [
    "OWNER",
    "ADMIN",
    "MANAGER",
    "TECHNICIAN",
  ] as const) {
    assert.equal(
      canViewTicketWorkspace(
        role,
        "all",
      ),
      true,
    );

    assert.deepEqual(
      getTicketWorkspaceScope({
        view: "all",
        organizationId:
          "organization-a",
        userId: "user-a",
        role,
      }),
      {
        organizationId:
          "organization-a",
      },
    );
  }
});

test("employees cannot open the organization-wide ticket workspace", () => {
  assert.equal(
    canViewTicketWorkspace(
      "EMPLOYEE",
      "all",
    ),
    false,
  );

  assert.equal(
    getTicketWorkspaceScope({
      view: "all",
      organizationId:
        "organization-a",
      userId: "user-a",
      role: "EMPLOYEE",
    }),
    null,
  );
});

test("operator queues are restricted by organization and assignee", () => {
  assert.deepEqual(
    getTicketWorkspaceScope({
      view: "mine",
      organizationId:
        "organization-a",
      userId: "technician-a",
      role: "TECHNICIAN",
    }),
    {
      organizationId:
        "organization-a",
      assigneeId: "technician-a",
    },
  );
});

test("employee request lists are restricted by organization and requester", () => {
  assert.deepEqual(
    getTicketWorkspaceScope({
      view: "mine",
      organizationId:
        "organization-a",
      userId: "employee-a",
      role: "EMPLOYEE",
    }),
    {
      organizationId:
        "organization-a",
      requesterId: "employee-a",
    },
  );
});
