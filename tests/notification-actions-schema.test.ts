import assert from "node:assert/strict";
import test from "node:test";

import { notificationActionSchema } from "../src/features/notifications/schemas/notification-actions";

test("accepts a single notification read action", () => {
  assert.deepEqual(
    notificationActionSchema.parse({
      action: "read",
      notificationId:
        "notification-a",
    }),
    {
      action: "read",
      notificationId:
        "notification-a",
    },
  );
});

test("trims a notification reference", () => {
  const result =
    notificationActionSchema.parse({
      action: "read",
      notificationId:
        "  notification-a  ",
    });

  assert.equal(result.action, "read");

  if (result.action === "read") {
    assert.equal(
      result.notificationId,
      "notification-a",
    );
  }
});

test("accepts a mark-all-read action", () => {
  assert.deepEqual(
    notificationActionSchema.parse({
      action: "read-all",
    }),
    {
      action: "read-all",
    },
  );
});

test("accepts a clear-read action", () => {
  assert.deepEqual(
    notificationActionSchema.parse({
      action: "clear-read",
    }),
    {
      action: "clear-read",
    },
  );
});

test("rejects missing and unsupported notification actions", () => {
  assert.equal(
    notificationActionSchema.safeParse({
      action: "read",
    }).success,
    false,
  );

  assert.equal(
    notificationActionSchema.safeParse({
      action: "delete-all",
    }).success,
    false,
  );
});
