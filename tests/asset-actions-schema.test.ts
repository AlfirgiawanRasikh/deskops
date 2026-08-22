import assert from "node:assert/strict";
import {
  describe,
  test,
} from "node:test";

import {
  updateAssetAssignmentActionSchema,
  updateAssetStatusActionSchema,
} from "../src/features/assets/schemas/asset-actions";

describe("asset lifecycle input schema", () => {
  test("accepts supported operational status changes", () => {
    for (const status of [
      "IN_STOCK",
      "IN_REPAIR",
      "RETIRED",
      "LOST",
    ]) {
      assert.equal(
        updateAssetStatusActionSchema.safeParse({
          assetId: "asset-a",
          status,
        }).success,
        true,
      );
    }
  });

  test("rejects direct ASSIGNED status changes", () => {
    assert.equal(
      updateAssetStatusActionSchema.safeParse({
        assetId: "asset-a",
        status: "ASSIGNED",
      }).success,
      false,
    );
  });

  test("accepts a member assignment", () => {
    const result =
      updateAssetAssignmentActionSchema.safeParse({
        assetId: "asset-a",
        assignedToUserId: "user-a",
      });

    assert.equal(result.success, true);
  });

  test("normalizes an empty assignment to null", () => {
    const result =
      updateAssetAssignmentActionSchema.safeParse({
        assetId: "asset-a",
        assignedToUserId: "",
      });

    assert.equal(result.success, true);

    if (result.success) {
      assert.equal(
        result.data.assignedToUserId,
        null,
      );
    }
  });

  test("rejects missing asset references", () => {
    assert.equal(
      updateAssetStatusActionSchema.safeParse({
        assetId: "",
        status: "IN_REPAIR",
      }).success,
      false,
    );
  });
});