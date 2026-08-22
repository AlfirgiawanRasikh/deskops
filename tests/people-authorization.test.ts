import assert from "node:assert/strict";
import {
  describe,
  test,
} from "node:test";

import { canViewPeopleDirectory } from "../src/features/people/policies/people-authorization";

describe("people directory authorization", () => {
  test("workspace management roles can view people", () => {
    assert.equal(
      canViewPeopleDirectory(
        "OWNER",
      ),
      true,
    );

    assert.equal(
      canViewPeopleDirectory(
        "ADMIN",
      ),
      true,
    );

    assert.equal(
      canViewPeopleDirectory(
        "MANAGER",
      ),
      true,
    );
  });

  test("technicians and employees cannot view the directory", () => {
    assert.equal(
      canViewPeopleDirectory(
        "TECHNICIAN",
      ),
      false,
    );

    assert.equal(
      canViewPeopleDirectory(
        "EMPLOYEE",
      ),
      false,
    );
  });
});