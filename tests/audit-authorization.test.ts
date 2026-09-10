import assert from "node:assert/strict";
import test from "node:test";

import { canViewAuditLog } from "../src/features/audit/policies/audit-authorization";

test("Owner and Admin can view the organization audit log", () => {
  assert.equal(
    canViewAuditLog("OWNER"),
    true,
  );
  assert.equal(
    canViewAuditLog("ADMIN"),
    true,
  );
});

test("operational and employee roles cannot view the organization audit log", () => {
  assert.equal(
    canViewAuditLog("MANAGER"),
    false,
  );
  assert.equal(
    canViewAuditLog("TECHNICIAN"),
    false,
  );
  assert.equal(
    canViewAuditLog("EMPLOYEE"),
    false,
  );
});
