import assert from "node:assert/strict";
import {
  describe,
  test,
} from "node:test";

import {
  canAssignTickets,
  canCreateTicketForOtherMembers,
  canCreateTickets,
  canReplyToOrganizationTicket,
  canUpdateTicketStatus,
  canViewInternalTicketComments,
  canViewOrganizationAssets,
  canViewOrganizationTickets,
  getAssetReadScope,
  getRequesterSelectionScope,
  getTicketReadScope,
  getTicketReplyScope,
  isAssignableTicketAssignee,
  isResourceInWorkspace,
  isWorkspaceRole,
  type WorkspaceRole,
} from "../src/features/auth/policies/workspace-authorization";

const organizationRoles: WorkspaceRole[] = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "TECHNICIAN",
];

describe("workspace role policy", () => {
  for (const role of organizationRoles) {
    test(`${role} receives organization operations capabilities`, () => {
      assert.equal(
        canViewOrganizationTickets(role),
        true,
      );
      assert.equal(
        canViewOrganizationAssets(role),
        true,
      );
      assert.equal(
        canViewInternalTicketComments(role),
        true,
      );
      assert.equal(
        canCreateTicketForOtherMembers(role),
        true,
      );
      assert.equal(
        canUpdateTicketStatus(role),
        true,
      );
      assert.equal(
        canAssignTickets(role),
        true,
      );
      assert.equal(
        canReplyToOrganizationTicket(role),
        true,
      );
      assert.equal(
        canCreateTickets(role),
        true,
      );
    });
  }

  test("EMPLOYEE is restricted to self-service capabilities", () => {
    assert.equal(
      canViewOrganizationTickets(
        "EMPLOYEE",
      ),
      false,
    );
    assert.equal(
      canViewOrganizationAssets(
        "EMPLOYEE",
      ),
      false,
    );
    assert.equal(
      canViewInternalTicketComments(
        "EMPLOYEE",
      ),
      false,
    );
    assert.equal(
      canCreateTicketForOtherMembers(
        "EMPLOYEE",
      ),
      false,
    );
    assert.equal(
      canUpdateTicketStatus(
        "EMPLOYEE",
      ),
      false,
    );
    assert.equal(
      canAssignTickets("EMPLOYEE"),
      false,
    );
    assert.equal(
      canReplyToOrganizationTicket(
        "EMPLOYEE",
      ),
      false,
    );
    assert.equal(
      canCreateTickets("EMPLOYEE"),
      true,
    );
  });

  test("unknown roles are rejected", () => {
    assert.equal(
      isWorkspaceRole("PEOPLE"),
      false,
    );
    assert.equal(
      isWorkspaceRole("SUPER_ADMIN"),
      false,
    );
  });

  test("only active technicians are valid ticket assignees", () => {
    assert.equal(
      isAssignableTicketAssignee(
        "TECHNICIAN",
        "ACTIVE",
      ),
      true,
    );
    assert.equal(
      isAssignableTicketAssignee(
        "TECHNICIAN",
        "SUSPENDED",
      ),
      false,
    );
    assert.equal(
      isAssignableTicketAssignee(
        "EMPLOYEE",
        "ACTIVE",
      ),
      false,
    );
  });
});

describe("tenant-scoped query policy", () => {
  const baseContext = {
    organizationId: "organization-a",
    userId: "user-a",
  };

  test("organization operators remain restricted to the active organization", () => {
    for (const role of organizationRoles) {
      assert.deepEqual(
        getTicketReadScope({
          ...baseContext,
          role,
        }),
        {
          organizationId:
            "organization-a",
        },
      );

      assert.deepEqual(
        getAssetReadScope({
          ...baseContext,
          role,
        }),
        {
          organizationId:
            "organization-a",
        },
      );
    }
  });

  test("EMPLOYEE ticket reads are restricted by organization and requester", () => {
    assert.deepEqual(
      getTicketReadScope({
        ...baseContext,
        role: "EMPLOYEE",
      }),
      {
        organizationId:
          "organization-a",
        requesterId: "user-a",
      },
    );
  });

  test("EMPLOYEE asset reads are restricted by organization and assignee", () => {
    assert.deepEqual(
      getAssetReadScope({
        ...baseContext,
        role: "EMPLOYEE",
      }),
      {
        organizationId:
          "organization-a",
        assignedToId: "user-a",
      },
    );
  });

  test("EMPLOYEE requester selection is locked to their active membership", () => {
    assert.deepEqual(
      getRequesterSelectionScope({
        ...baseContext,
        role: "EMPLOYEE",
      }),
      {
        organizationId:
          "organization-a",
        status: "ACTIVE",
        userId: "user-a",
      },
    );
  });

  test("EMPLOYEE replies are restricted to tickets they requested", () => {
    assert.deepEqual(
      getTicketReplyScope({
        ...baseContext,
        role: "EMPLOYEE",
      }),
      {
        organizationId:
          "organization-a",
        requesterId: "user-a",
      },
    );
  });

  test("cross-organization resources are denied", () => {
    assert.equal(
      isResourceInWorkspace(
        "organization-a",
        "organization-a",
      ),
      true,
    );

    assert.equal(
      isResourceInWorkspace(
        "organization-a",
        "organization-b",
      ),
      false,
    );
  });
});
