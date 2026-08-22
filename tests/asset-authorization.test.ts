import assert from "node:assert/strict";
import {
  describe,
  test,
} from "node:test";

import {
  canAssignAssets,
  canUpdateAssetStatus,
} from "../src/features/assets/policies/asset-authorization";

describe("asset lifecycle authorization", () => {
  test("workspace management roles can assign assets", () => {
    assert.equal(
      canAssignAssets("OWNER"),
      true,
    );

    assert.equal(
      canAssignAssets("ADMIN"),
      true,
    );

    assert.equal(
      canAssignAssets("MANAGER"),
      true,
    );
  });

  test("technicians and employees cannot assign assets", () => {
    assert.equal(
      canAssignAssets("TECHNICIAN"),
      false,
    );

    assert.equal(
      canAssignAssets("EMPLOYEE"),
      false,
    );
  });

  test("operational roles can update asset status", () => {
    for (const role of [
      "OWNER",
      "ADMIN",
      "MANAGER",
      "TECHNICIAN",
    ] as const) {
      assert.equal(
        canUpdateAssetStatus(role),
        true,
      );
    }
  });

  test("employees have read-only asset access", () => {
    assert.equal(
      canUpdateAssetStatus("EMPLOYEE"),
      false,
    );
  });
});