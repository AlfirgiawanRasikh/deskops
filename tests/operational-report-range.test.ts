import assert from "node:assert/strict";
import test from "node:test";

import { parseOperationalReportRange } from "../src/features/reports/utils/report-range";

test("accepts supported operational report ranges", () => {
  assert.equal(
    parseOperationalReportRange("7d"),
    "7d",
  );
  assert.equal(
    parseOperationalReportRange("30d"),
    "30d",
  );
  assert.equal(
    parseOperationalReportRange("90d"),
    "90d",
  );
});

test("uses the first value when the query parameter is repeated", () => {
  assert.equal(
    parseOperationalReportRange([
      "90d",
      "7d",
    ]),
    "90d",
  );
});

test("defaults unsupported or missing ranges to 30 days", () => {
  assert.equal(
    parseOperationalReportRange(
      undefined,
    ),
    "30d",
  );
  assert.equal(
    parseOperationalReportRange("1y"),
    "30d",
  );
  assert.equal(
    parseOperationalReportRange([]),
    "30d",
  );
});
