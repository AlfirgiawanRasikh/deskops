import assert from "node:assert/strict";
import test from "node:test";

import { updateMembershipActionSchema } from "../src/features/people/schemas/people-actions";

test("accepts a valid membership update", () => {
  const result =
    updateMembershipActionSchema.safeParse({
      membershipId:
        "cm1234567890membership",
      role: "TECHNICIAN",
      status: "ACTIVE",
      department: "IT Operations",
    });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(
      result.data.department,
      "IT Operations",
    );
  }
});

test("trims the department value", () => {
  const result =
    updateMembershipActionSchema.safeParse({
      membershipId:
        "cm1234567890membership",
      role: "EMPLOYEE",
      status: "ACTIVE",
      department: "  Finance  ",
    });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(
      result.data.department,
      "Finance",
    );
  }
});

test("converts an empty department to null", () => {
  const result =
    updateMembershipActionSchema.safeParse({
      membershipId:
        "cm1234567890membership",
      role: "EMPLOYEE",
      status: "ACTIVE",
      department: "   ",
    });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(
      result.data.department,
      null,
    );
  }
});

test("rejects invited as an editable status", () => {
  const result =
    updateMembershipActionSchema.safeParse({
      membershipId:
        "cm1234567890membership",
      role: "EMPLOYEE",
      status: "INVITED",
      department: "",
    });

  assert.equal(result.success, false);
});

test("rejects an unsupported role", () => {
  const result =
    updateMembershipActionSchema.safeParse({
      membershipId:
        "cm1234567890membership",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      department: "",
    });

  assert.equal(result.success, false);
});

test("rejects departments longer than 80 characters", () => {
  const result =
    updateMembershipActionSchema.safeParse({
      membershipId:
        "cm1234567890membership",
      role: "EMPLOYEE",
      status: "ACTIVE",
      department: "a".repeat(81),
    });

  assert.equal(result.success, false);
});