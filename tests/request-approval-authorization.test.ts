import assert from "node:assert/strict";
import test from "node:test";

import {
  canBeTicketApprover,
  canDecideTicketApproval,
  canRequestTicketApproval,
  canSelectTicketApprover,
  getApprovalDecisionRecipients,
  getPendingApprovalReadScope,
} from "../src/features/approvals/policies/request-approval-authorization";

test("workspace management roles can request service request approval", () => {
  for (const role of [
    "OWNER",
    "ADMIN",
    "MANAGER",
  ] as const) {
    assert.equal(
      canRequestTicketApproval({
        role,
        actorId: "manager-a",
        assigneeId: null,
      }),
      true,
    );
  }
});

test("technicians request approval only for their assigned tickets", () => {
  assert.equal(
    canRequestTicketApproval({
      role: "TECHNICIAN",
      actorId: "technician-a",
      assigneeId: "technician-a",
    }),
    true,
  );
  assert.equal(
    canRequestTicketApproval({
      role: "TECHNICIAN",
      actorId: "technician-a",
      assigneeId: "technician-b",
    }),
    false,
  );
  assert.equal(
    canRequestTicketApproval({
      role: "EMPLOYEE",
      actorId: "employee-a",
      assigneeId: "employee-a",
    }),
    false,
  );
});

test("only active management members can be approvers", () => {
  for (const role of [
    "OWNER",
    "ADMIN",
    "MANAGER",
  ] as const) {
    assert.equal(
      canBeTicketApprover({
        role,
        status: "ACTIVE",
      }),
      true,
    );
  }

  assert.equal(
    canBeTicketApprover({
      role: "TECHNICIAN",
      status: "ACTIVE",
    }),
    false,
  );
  assert.equal(
    canBeTicketApprover({
      role: "OWNER",
      status: "SUSPENDED",
    }),
    false,
  );
});

test("request actors and ticket requesters cannot be selected as approvers", () => {
  const base = {
    actorId: "manager-a",
    ticketRequesterId: "employee-a",
    role: "OWNER" as const,
    status: "ACTIVE" as const,
  };

  assert.equal(
    canSelectTicketApprover({
      ...base,
      candidateId: "owner-a",
    }),
    true,
  );
  assert.equal(
    canSelectTicketApprover({
      ...base,
      candidateId: "manager-a",
    }),
    false,
  );
  assert.equal(
    canSelectTicketApprover({
      ...base,
      candidateId: "employee-a",
    }),
    false,
  );
});

test("only the assigned approver can decide a pending request", () => {
  assert.equal(
    canDecideTicketApproval({
      role: "MANAGER",
      actorId: "manager-a",
      approverId: "manager-a",
      status: "PENDING",
    }),
    true,
  );
  assert.equal(
    canDecideTicketApproval({
      role: "MANAGER",
      actorId: "manager-b",
      approverId: "manager-a",
      status: "PENDING",
    }),
    false,
  );
  assert.equal(
    canDecideTicketApproval({
      role: "TECHNICIAN",
      actorId: "technician-a",
      approverId: "technician-a",
      status: "PENDING",
    }),
    false,
  );
  assert.equal(
    canDecideTicketApproval({
      role: "OWNER",
      actorId: "owner-a",
      approverId: "owner-a",
      status: "APPROVED",
    }),
    false,
  );
});

test("approval decisions notify participants without duplicates or the actor", () => {
  assert.deepEqual(
    getApprovalDecisionRecipients({
      actorId: "owner-a",
      ticketRequesterId: "employee-a",
      ticketAssigneeId: "technician-a",
      requestedById: "technician-a",
    }),
    ["employee-a", "technician-a"],
  );

  assert.deepEqual(
    getApprovalDecisionRecipients({
      actorId: "owner-a",
      ticketRequesterId: "owner-a",
      ticketAssigneeId: null,
      requestedById: "owner-a",
    }),
    [],
  );
});

test("pending approval inbox is scoped to the assigned approver and organization", () => {
  assert.deepEqual(
    getPendingApprovalReadScope({
      organizationId: "organization-a",
      userId: "manager-a",
      role: "MANAGER",
    }),
    {
      approverId: "manager-a",
      status: "PENDING",
      ticket: {
        organizationId:
          "organization-a",
      },
    },
  );

  assert.equal(
    getPendingApprovalReadScope({
      organizationId: "organization-a",
      userId: "technician-a",
      role: "TECHNICIAN",
    }),
    null,
  );
});
