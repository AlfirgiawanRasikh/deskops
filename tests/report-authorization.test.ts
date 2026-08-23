import assert from "node:assert/strict";
import test from "node:test";

import { canViewOperationalReports } from "../src/features/reports/policies/report-authorization";

test("Owner, Admin, and Manager can view operational reports", () => {
  assert.equal(
    canViewOperationalReports("OWNER"),
    true,
  );
  assert.equal(
    canViewOperationalReports("ADMIN"),
    true,
  );
  assert.equal(
    canViewOperationalReports("MANAGER"),
    true,
  );
});

test("Technician and Employee cannot view operational reports", () => {
  assert.equal(
    canViewOperationalReports(
      "TECHNICIAN",
    ),
    false,
  );
  assert.equal(
    canViewOperationalReports("EMPLOYEE"),
    false,
  );
});
