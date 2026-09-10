import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateSlaComplianceRate,
  getTicketSlaSnapshot,
  shouldRecordFirstResponse,
} from "../src/features/tickets/utils/ticket-sla";

const createdAt = new Date(
  "2026-09-10T08:00:00.000Z",
);

function minutesAfter(minutes: number) {
  return new Date(
    createdAt.getTime() +
      minutes * 60_000,
  );
}

function snapshot(
  overrides: Partial<
    Parameters<
      typeof getTicketSlaSnapshot
    >[0]
  > = {},
) {
  return getTicketSlaSnapshot({
    status: "OPEN",
    createdAt,
    firstResponseDueAt:
      minutesAfter(20),
    firstRespondedAt: null,
    resolutionDueAt:
      minutesAfter(120),
    resolvedAt: null,
    closedAt: null,
    now: minutesAfter(5),
    ...overrides,
  });
}

test("tracks an on-time first response target", () => {
  const result = snapshot();

  assert.equal(
    result.phase,
    "first_response",
  );
  assert.equal(
    result.state,
    "on_track",
  );
  assert.equal(
    result.timingLabel,
    "15m left",
  );
  assert.equal(result.progress, 25);
});

test("marks an active objective at risk after 75 percent", () => {
  const result = snapshot({
    now: minutesAfter(15),
  });

  assert.equal(result.state, "at_risk");
  assert.equal(result.tone, "warning");
  assert.equal(
    result.timingLabel,
    "5m left",
  );
});

test("marks a missed first response as breached", () => {
  const result = snapshot({
    now: minutesAfter(25),
  });

  assert.equal(result.state, "breached");
  assert.equal(result.tone, "danger");
  assert.equal(
    result.timingLabel,
    "5m overdue",
  );
});

test("keeps a late first response breach visible", () => {
  const result = snapshot({
    firstRespondedAt:
      minutesAfter(25),
    now: minutesAfter(30),
  });

  assert.equal(
    result.phase,
    "first_response",
  );
  assert.equal(result.state, "breached");
  assert.equal(
    result.timingLabel,
    "5m late",
  );
});

test("tracks resolution after a timely first response", () => {
  const result = snapshot({
    firstRespondedAt:
      minutesAfter(10),
    now: minutesAfter(30),
  });

  assert.equal(
    result.phase,
    "resolution",
  );
  assert.equal(result.state, "on_track");
  assert.equal(
    result.timingLabel,
    "2h left",
  );
});

test("marks a resolved ticket as meeting all targets", () => {
  const result = snapshot({
    status: "RESOLVED",
    firstRespondedAt:
      minutesAfter(10),
    resolvedAt: minutesAfter(90),
    now: minutesAfter(100),
  });

  assert.equal(result.phase, "complete");
  assert.equal(result.state, "met");
  assert.equal(
    result.timingLabel,
    "All measured targets met",
  );
});

test("treats a resolved ticket without a response as breached", () => {
  const result = snapshot({
    status: "RESOLVED",
    resolvedAt: minutesAfter(30),
    now: minutesAfter(35),
  });

  assert.equal(result.phase, "complete");
  assert.equal(result.state, "breached");
  assert.equal(
    result.phaseLabel,
    "First response",
  );
  assert.equal(
    result.firstResponse.timingLabel,
    "No completion recorded",
  );
});

test("preserves a resolution breach after completion", () => {
  const result = snapshot({
    status: "RESOLVED",
    firstRespondedAt:
      minutesAfter(10),
    resolvedAt:
      minutesAfter(135),
    now: minutesAfter(140),
  });

  assert.equal(result.phase, "complete");
  assert.equal(result.state, "breached");
  assert.equal(
    result.phaseLabel,
    "Resolution",
  );
  assert.equal(
    result.timingLabel,
    "15m late",
  );
});

test("does not grade a canceled ticket", () => {
  const result = snapshot({
    status: "CANCELED",
    now: minutesAfter(200),
  });

  assert.equal(result.state, "canceled");
  assert.equal(result.tone, "complete");
});

test("calculates compliance from measured objectives only", () => {
  const met = snapshot({
    status: "RESOLVED",
    firstRespondedAt:
      minutesAfter(10),
    resolvedAt: minutesAfter(90),
    now: minutesAfter(100),
  });
  const breached = snapshot({
    status: "RESOLVED",
    firstRespondedAt:
      minutesAfter(25),
    resolvedAt:
      minutesAfter(135),
    now: minutesAfter(140),
  });
  const pending = snapshot();

  assert.equal(
    calculateSlaComplianceRate([
      met.firstResponse,
      met.resolution,
      breached.firstResponse,
      breached.resolution,
      pending.firstResponse,
    ]),
    50,
  );
});

test("records only the first operational public response", () => {
  assert.equal(
    shouldRecordFirstResponse({
      actorRole: "TECHNICIAN",
      actorId: "technician-1",
      requesterId: "employee-1",
      firstRespondedAt: null,
    }),
    true,
  );

  assert.equal(
    shouldRecordFirstResponse({
      actorRole: "EMPLOYEE",
      actorId: "employee-1",
      requesterId: "employee-1",
      firstRespondedAt: null,
    }),
    false,
  );

  assert.equal(
    shouldRecordFirstResponse({
      actorRole: "OWNER",
      actorId: "owner-1",
      requesterId: "owner-1",
      firstRespondedAt: null,
    }),
    false,
  );

  assert.equal(
    shouldRecordFirstResponse({
      actorRole: "MANAGER",
      actorId: "manager-1",
      requesterId: "employee-1",
      firstRespondedAt:
        minutesAfter(5),
    }),
    false,
  );
});
