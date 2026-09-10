export type TicketSlaState =
  | "on_track"
  | "at_risk"
  | "breached"
  | "met"
  | "not_set"
  | "canceled";

export type TicketSlaTone =
  | "neutral"
  | "warning"
  | "danger"
  | "complete";

export type TicketSlaPhase =
  | "first_response"
  | "resolution"
  | "complete";

export type TicketSlaObjective = {
  label: "First response" | "Resolution";
  state: TicketSlaState;
  statusLabel: string;
  timingLabel: string;
  progress: number;
};

export type TicketSlaSnapshot = {
  phase: TicketSlaPhase;
  phaseLabel: string;
  state: TicketSlaState;
  tone: TicketSlaTone;
  statusLabel: string;
  timingLabel: string;
  progress: number;
  firstResponse: TicketSlaObjective;
  resolution: TicketSlaObjective;
};

type TicketSlaInput = {
  status: string;
  createdAt: Date;
  firstResponseDueAt: Date | null;
  firstRespondedAt: Date | null;
  resolutionDueAt: Date | null;
  resolvedAt: Date | null;
  closedAt?: Date | null;
  now: Date;
};

type FirstResponseInput = {
  actorRole: string;
  actorId: string;
  requesterId: string;
  firstRespondedAt: Date | null;
};

const operationalResponderRoles =
  new Set([
    "OWNER",
    "ADMIN",
    "MANAGER",
    "TECHNICIAN",
  ]);

const terminalStatuses = new Set([
  "RESOLVED",
  "CLOSED",
]);

const AT_RISK_PROGRESS = 75;
const MINUTE_IN_MS = 60_000;

function clampProgress(value: number) {
  return Math.min(
    100,
    Math.max(0, Math.round(value)),
  );
}

function formatCompactDuration(
  milliseconds: number,
) {
  const minutes = Math.max(
    1,
    Math.ceil(
      Math.abs(milliseconds) /
        MINUTE_IN_MS,
    ),
  );

  if (minutes < 60) {
    return `${minutes}m`;
  }

  if (minutes < 1440) {
    return `${Math.ceil(minutes / 60)}h`;
  }

  return `${Math.ceil(minutes / 1440)}d`;
}

function statusLabel(
  state: TicketSlaState,
) {
  switch (state) {
    case "on_track":
      return "On track";
    case "at_risk":
      return "At risk";
    case "breached":
      return "Breached";
    case "met":
      return "Met";
    case "canceled":
      return "Canceled";
    default:
      return "No target";
  }
}

export function getTicketSlaTone(
  state: TicketSlaState,
): TicketSlaTone {
  switch (state) {
    case "at_risk":
      return "warning";
    case "breached":
      return "danger";
    case "met":
    case "canceled":
      return "complete";
    default:
      return "neutral";
  }
}

function createObjective({
  label,
  startAt,
  dueAt,
  completedAt,
  now,
}: {
  label: TicketSlaObjective["label"];
  startAt: Date;
  dueAt: Date | null;
  completedAt: Date | null;
  now: Date;
}): TicketSlaObjective {
  if (
    !dueAt ||
    dueAt.getTime() <=
      startAt.getTime()
  ) {
    return {
      label,
      state: "not_set",
      statusLabel:
        statusLabel("not_set"),
      timingLabel:
        "No target configured",
      progress: 0,
    };
  }

  if (completedAt) {
    const variance =
      dueAt.getTime() -
      completedAt.getTime();
    const state =
      variance >= 0
        ? "met"
        : "breached";

    return {
      label,
      state,
      statusLabel: statusLabel(state),
      timingLabel:
        variance === 0
          ? "Completed on target"
          : variance > 0
            ? `${formatCompactDuration(variance)} before target`
            : `${formatCompactDuration(variance)} late`,
      progress: 100,
    };
  }

  const remaining =
    dueAt.getTime() - now.getTime();

  if (remaining <= 0) {
    return {
      label,
      state: "breached",
      statusLabel:
        statusLabel("breached"),
      timingLabel: `${formatCompactDuration(
        remaining,
      )} overdue`,
      progress: 100,
    };
  }

  const targetDuration =
    dueAt.getTime() -
    startAt.getTime();
  const elapsed =
    now.getTime() - startAt.getTime();
  const progress = clampProgress(
    (elapsed / targetDuration) * 100,
  );
  const state =
    progress >= AT_RISK_PROGRESS
      ? "at_risk"
      : "on_track";

  return {
    label,
    state,
    statusLabel: statusLabel(state),
    timingLabel: `${formatCompactDuration(
      remaining,
    )} left`,
    progress,
  };
}

function missingObjective(
  objective: TicketSlaObjective,
) {
  if (objective.state === "not_set") {
    return objective;
  }

  return {
    ...objective,
    state: "breached" as const,
    statusLabel: statusLabel("breached"),
    timingLabel: "No completion recorded",
    progress: 100,
  };
}

function canceledObjective(
  objective: TicketSlaObjective,
) {
  if (
    objective.state === "met" ||
    objective.state === "breached" ||
    objective.state === "not_set"
  ) {
    return objective;
  }

  return {
    ...objective,
    state: "canceled" as const,
    statusLabel: statusLabel("canceled"),
    timingLabel: "Target canceled",
    progress: 100,
  };
}

function createSnapshot(
  phase: TicketSlaPhase,
  phaseLabel: string,
  objective: TicketSlaObjective,
  firstResponse: TicketSlaObjective,
  resolution: TicketSlaObjective,
): TicketSlaSnapshot {
  return {
    phase,
    phaseLabel,
    state: objective.state,
    tone: getTicketSlaTone(
      objective.state,
    ),
    statusLabel:
      objective.statusLabel,
    timingLabel:
      objective.timingLabel,
    progress: objective.progress,
    firstResponse,
    resolution,
  };
}

export function getTicketSlaSnapshot({
  status,
  createdAt,
  firstResponseDueAt,
  firstRespondedAt,
  resolutionDueAt,
  resolvedAt,
  closedAt = null,
  now,
}: TicketSlaInput): TicketSlaSnapshot {
  let firstResponse = createObjective({
    label: "First response",
    startAt: createdAt,
    dueAt: firstResponseDueAt,
    completedAt: firstRespondedAt,
    now,
  });

  let resolution = createObjective({
    label: "Resolution",
    startAt: createdAt,
    dueAt: resolutionDueAt,
    completedAt:
      resolvedAt ?? closedAt,
    now,
  });

  if (status === "CANCELED") {
    firstResponse =
      canceledObjective(firstResponse);
    resolution =
      canceledObjective(resolution);

    const canceled = {
      label: "Resolution" as const,
      state: "canceled" as const,
      statusLabel:
        statusLabel("canceled"),
      timingLabel: "Ticket canceled",
      progress: 100,
    };

    return createSnapshot(
      "complete",
      "Service level",
      canceled,
      firstResponse,
      resolution,
    );
  }

  if (terminalStatuses.has(status)) {
    if (
      firstResponseDueAt &&
      !firstRespondedAt
    ) {
      firstResponse =
        missingObjective(firstResponse);
    }

    if (
      resolutionDueAt &&
      !resolvedAt &&
      !closedAt
    ) {
      resolution =
        missingObjective(resolution);
    }

    const breached =
      firstResponse.state ===
      "breached"
        ? firstResponse
        : resolution.state ===
            "breached"
          ? resolution
          : null;

    if (breached) {
      return createSnapshot(
        "complete",
        breached.label,
        breached,
        firstResponse,
        resolution,
      );
    }

    const measurable = [
      firstResponse,
      resolution,
    ].filter(
      (objective) =>
        objective.state !== "not_set",
    );

    const overall = {
      label: "Resolution" as const,
      state:
        measurable.length > 0
          ? ("met" as const)
          : ("not_set" as const),
      statusLabel:
        measurable.length > 0
          ? "Met"
          : "No target",
      timingLabel:
        measurable.length > 0
          ? "All measured targets met"
          : "No targets configured",
      progress: 100,
    };

    return createSnapshot(
      "complete",
      "Service level",
      overall,
      firstResponse,
      resolution,
    );
  }

  if (
    firstResponse.state ===
    "breached"
  ) {
    return createSnapshot(
      "first_response",
      "First response",
      firstResponse,
      firstResponse,
      resolution,
    );
  }

  if (
    firstResponseDueAt &&
    !firstRespondedAt
  ) {
    return createSnapshot(
      "first_response",
      "First response",
      firstResponse,
      firstResponse,
      resolution,
    );
  }

  return createSnapshot(
    "resolution",
    "Resolution",
    resolution,
    firstResponse,
    resolution,
  );
}

export function calculateSlaComplianceRate(
  objectives: TicketSlaObjective[],
) {
  const measured = objectives.filter(
    (objective) =>
      objective.state === "met" ||
      objective.state === "breached",
  );

  if (measured.length === 0) {
    return null;
  }

  const met = measured.filter(
    (objective) =>
      objective.state === "met",
  ).length;

  return Math.round(
    (met / measured.length) * 100,
  );
}

export function shouldRecordFirstResponse({
  actorRole,
  actorId,
  requesterId,
  firstRespondedAt,
}: FirstResponseInput) {
  return (
    firstRespondedAt === null &&
    actorId !== requesterId &&
    operationalResponderRoles.has(
      actorRole,
    )
  );
}
