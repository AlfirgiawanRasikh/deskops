import assert from "node:assert/strict";
import test from "node:test";

import {
  canUpdateWorkspaceSettings,
  canViewWorkspaceSettings,
} from "../src/features/settings/policies/settings-authorization";

test("Owner and Admin can view workspace settings", () => {
  assert.equal(
    canViewWorkspaceSettings("OWNER"),
    true,
  );
  assert.equal(
    canViewWorkspaceSettings("ADMIN"),
    true,
  );
});

test("operational roles cannot view workspace settings", () => {
  assert.equal(
    canViewWorkspaceSettings("MANAGER"),
    false,
  );
  assert.equal(
    canViewWorkspaceSettings(
      "TECHNICIAN",
    ),
    false,
  );
  assert.equal(
    canViewWorkspaceSettings("EMPLOYEE"),
    false,
  );
});

test("only Owner and Admin can update workspace settings", () => {
  assert.equal(
    canUpdateWorkspaceSettings("OWNER"),
    true,
  );
  assert.equal(
    canUpdateWorkspaceSettings("ADMIN"),
    true,
  );
  assert.equal(
    canUpdateWorkspaceSettings("MANAGER"),
    false,
  );
  assert.equal(
    canUpdateWorkspaceSettings(
      "TECHNICIAN",
    ),
    false,
  );
  assert.equal(
    canUpdateWorkspaceSettings("EMPLOYEE"),
    false,
  );
});
