import assert from "node:assert/strict";
import test from "node:test";

import { updateWorkspaceSettingsSchema } from "../src/features/settings/schemas/workspace-settings";

const validInput = {
  name: "Nusantara Systems",
  timezone: "Asia/Jakarta",
  urgentFirstResponseMinutes: "15",
  urgentResolutionMinutes: "30",
  highFirstResponseMinutes: "30",
  highResolutionMinutes: "240",
  normalFirstResponseMinutes: "120",
  normalResolutionMinutes: "480",
  lowFirstResponseMinutes: "240",
  lowResolutionMinutes: "2880",
};

test("accepts and normalizes valid workspace settings", () => {
  const result =
    updateWorkspaceSettingsSchema.parse({
      ...validInput,
      name: "  DeskOps Service Team  ",
    });

  assert.equal(
    result.name,
    "DeskOps Service Team",
  );
  assert.equal(
    result.urgentFirstResponseMinutes,
    15,
  );
  assert.equal(
    result.lowResolutionMinutes,
    2880,
  );
});

test("rejects an unsupported timezone", () => {
  const result =
    updateWorkspaceSettingsSchema.safeParse({
      ...validInput,
      timezone: "Invalid/Timezone",
    });

  assert.equal(result.success, false);
});

test("rejects zero and fractional target minutes", () => {
  const zeroResult =
    updateWorkspaceSettingsSchema.safeParse({
      ...validInput,
      urgentFirstResponseMinutes: "0",
    });

  const fractionalResult =
    updateWorkspaceSettingsSchema.safeParse({
      ...validInput,
      highResolutionMinutes: "2.5",
    });

  assert.equal(zeroResult.success, false);
  assert.equal(
    fractionalResult.success,
    false,
  );
});

test("rejects resolution targets shorter than first response targets", () => {
  const result =
    updateWorkspaceSettingsSchema.safeParse({
      ...validInput,
      normalFirstResponseMinutes: "500",
      normalResolutionMinutes: "480",
    });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.deepEqual(
      result.error.flatten().fieldErrors
        .normalResolutionMinutes,
      [
        "Resolution target cannot be shorter than first response target.",
      ],
    );
  }
});
