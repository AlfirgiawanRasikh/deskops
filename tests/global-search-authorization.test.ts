import assert from "node:assert/strict";
import test from "node:test";

import type { WorkspaceRole } from "../src/features/auth/policies/workspace-authorization";
import { getGlobalSearchAuthorization } from "../src/features/search/policies/global-search-authorization";

const organizationId =
  "organization-a";
const userId = "user-a";

test("workspace operators search organization tickets and assets", () => {
  for (const role of [
    "OWNER",
    "ADMIN",
    "MANAGER",
    "TECHNICIAN",
  ] as const) {
    const authorization =
      getGlobalSearchAuthorization({
        organizationId,
        userId,
        role,
      });

    assert.deepEqual(
      authorization.ticketScope,
      { organizationId },
    );
    assert.deepEqual(
      authorization.assetScope,
      { organizationId },
    );
  }
});

test("people results follow people directory authorization", () => {
  const expectedAccess: Record<
    WorkspaceRole,
    boolean
  > = {
    OWNER: true,
    ADMIN: true,
    MANAGER: true,
    TECHNICIAN: false,
    EMPLOYEE: false,
  };

  for (const [
    role,
    expected,
  ] of Object.entries(
    expectedAccess,
  ) as Array<[
    WorkspaceRole,
    boolean,
  ]>) {
    const authorization =
      getGlobalSearchAuthorization({
        organizationId,
        userId,
        role,
      });

    assert.equal(
      authorization.canSearchPeople,
      expected,
    );
  }
});

test("employees only search their own requests and assigned assets", () => {
  const authorization =
    getGlobalSearchAuthorization({
      organizationId,
      userId,
      role: "EMPLOYEE",
    });

  assert.deepEqual(
    authorization.ticketScope,
    {
      organizationId,
      requesterId: userId,
    },
  );
  assert.deepEqual(
    authorization.assetScope,
    {
      organizationId,
      assignedToId: userId,
    },
  );
  assert.equal(
    authorization.canSearchPeople,
    false,
  );
});
