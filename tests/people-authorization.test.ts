import assert from "node:assert/strict";
import test from "node:test";

import {
  canAssignMembershipRole,
  canManageMembership,
  canViewPeopleDirectory,
  getAssignableMembershipRoles,
} from "../src/features/people/policies/people-authorization";

test("Owner, Admin, and Manager can view the people directory", () => {
  assert.equal(
    canViewPeopleDirectory("OWNER"),
    true,
  );
  assert.equal(
    canViewPeopleDirectory("ADMIN"),
    true,
  );
  assert.equal(
    canViewPeopleDirectory("MANAGER"),
    true,
  );
});

test("Technician and Employee cannot view the people directory", () => {
  assert.equal(
    canViewPeopleDirectory("TECHNICIAN"),
    false,
  );
  assert.equal(
    canViewPeopleDirectory("EMPLOYEE"),
    false,
  );
});

test("members cannot modify their own membership", () => {
  assert.equal(
    canManageMembership({
      actorRole: "OWNER",
      targetRole: "EMPLOYEE",
      isSelf: true,
    }),
    false,
  );

  assert.equal(
    canManageMembership({
      actorRole: "ADMIN",
      targetRole: "EMPLOYEE",
      isSelf: true,
    }),
    false,
  );
});

test("Owner can manage any other membership", () => {
  assert.equal(
    canManageMembership({
      actorRole: "OWNER",
      targetRole: "OWNER",
      isSelf: false,
    }),
    true,
  );

  assert.equal(
    canManageMembership({
      actorRole: "OWNER",
      targetRole: "ADMIN",
      isSelf: false,
    }),
    true,
  );

  assert.equal(
    canManageMembership({
      actorRole: "OWNER",
      targetRole: "EMPLOYEE",
      isSelf: false,
    }),
    true,
  );
});

test("Admin can manage Manager, Technician, and Employee only", () => {
  assert.equal(
    canManageMembership({
      actorRole: "ADMIN",
      targetRole: "OWNER",
      isSelf: false,
    }),
    false,
  );

  assert.equal(
    canManageMembership({
      actorRole: "ADMIN",
      targetRole: "ADMIN",
      isSelf: false,
    }),
    false,
  );

  assert.equal(
    canManageMembership({
      actorRole: "ADMIN",
      targetRole: "MANAGER",
      isSelf: false,
    }),
    true,
  );

  assert.equal(
    canManageMembership({
      actorRole: "ADMIN",
      targetRole: "TECHNICIAN",
      isSelf: false,
    }),
    true,
  );

  assert.equal(
    canManageMembership({
      actorRole: "ADMIN",
      targetRole: "EMPLOYEE",
      isSelf: false,
    }),
    true,
  );
});

test("Manager can manage Technician and Employee only", () => {
  assert.equal(
    canManageMembership({
      actorRole: "MANAGER",
      targetRole: "MANAGER",
      isSelf: false,
    }),
    false,
  );

  assert.equal(
    canManageMembership({
      actorRole: "MANAGER",
      targetRole: "TECHNICIAN",
      isSelf: false,
    }),
    true,
  );

  assert.equal(
    canManageMembership({
      actorRole: "MANAGER",
      targetRole: "EMPLOYEE",
      isSelf: false,
    }),
    true,
  );
});

test("Technician and Employee cannot manage memberships", () => {
  assert.equal(
    canManageMembership({
      actorRole: "TECHNICIAN",
      targetRole: "EMPLOYEE",
      isSelf: false,
    }),
    false,
  );

  assert.equal(
    canManageMembership({
      actorRole: "EMPLOYEE",
      targetRole: "EMPLOYEE",
      isSelf: false,
    }),
    false,
  );
});

test("assignable roles follow the actor hierarchy", () => {
  assert.deepEqual(
    getAssignableMembershipRoles("OWNER"),
    [
      "OWNER",
      "ADMIN",
      "MANAGER",
      "TECHNICIAN",
      "EMPLOYEE",
    ],
  );

  assert.deepEqual(
    getAssignableMembershipRoles("ADMIN"),
    [
      "MANAGER",
      "TECHNICIAN",
      "EMPLOYEE",
    ],
  );

  assert.deepEqual(
    getAssignableMembershipRoles("MANAGER"),
    ["TECHNICIAN", "EMPLOYEE"],
  );

  assert.deepEqual(
    getAssignableMembershipRoles(
      "TECHNICIAN",
    ),
    [],
  );
});

test("actors cannot assign roles outside their hierarchy", () => {
  assert.equal(
    canAssignMembershipRole(
      "ADMIN",
      "OWNER",
    ),
    false,
  );

  assert.equal(
    canAssignMembershipRole(
      "ADMIN",
      "MANAGER",
    ),
    true,
  );

  assert.equal(
    canAssignMembershipRole(
      "MANAGER",
      "ADMIN",
    ),
    false,
  );

  assert.equal(
    canAssignMembershipRole(
      "MANAGER",
      "TECHNICIAN",
    ),
    true,
  );
});