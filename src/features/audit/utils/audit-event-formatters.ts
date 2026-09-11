import type {
  AuditLogRecord,
  AuditLogRecordCategory,
} from "@/features/audit/types/audit-log";

type AuditActor = {
  id: string;
  name: string;
  email: string;
} | null;

type BaseAuditEvent = {
  id: string;
  action: string;
  fromValue: unknown;
  toValue: unknown;
  metadata: unknown;
  createdAt: Date;
  actor: AuditActor;
};

export type TicketAuditEvent =
  BaseAuditEvent & {
    ticket: {
      id: string;
      number: number;
      type: string;
      title: string;
    };
  };

export type AssetAuditEvent =
  BaseAuditEvent & {
    asset: {
      id: string;
      assetTag: string;
      name: string;
    };
  };

export type KnowledgeAuditEvent =
  BaseAuditEvent & {
    article: {
      id: string;
      title: string;
      category: string;
    };
  };

export type MembershipAuditEvent =
  BaseAuditEvent & {
    membership: {
      id: string;
      user: {
        name: string;
        email: string;
      };
    };
  };

export type WorkspaceAuditEvent =
  BaseAuditEvent & {
    organization: {
      name: string;
    };
  };

function asRecord(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<
    string,
    unknown
  >;
}

function getString(
  value: unknown,
  key: string,
) {
  const record = asRecord(value);
  const field = record?.[key];

  return typeof field === "string"
    ? field
    : null;
}

function getStringArray(
  value: unknown,
  key: string,
) {
  const record = asRecord(value);
  const field = record?.[key];

  if (!Array.isArray(field)) {
    return [];
  }

  return field.filter(
    (item): item is string =>
      typeof item === "string",
  );
}

function formatEnum(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length === 0
  ) {
    return "None";
  }

  const normalized = value
    .toLowerCase()
    .replaceAll("_", " ");

  return `${normalized
    .charAt(0)
    .toUpperCase()}${normalized.slice(1)}`;
}

function formatSource(
  metadata: unknown,
  fallback: string,
) {
  const source = getString(
    metadata,
    "source",
  );

  return source
    ? formatEnum(
        source.replaceAll("-", "_"),
      )
    : fallback;
}

function mapActor(actor: AuditActor) {
  return actor
    ? {
        id: actor.id,
        name: actor.name,
        email: actor.email,
      }
    : {
        id: null,
        name: "System or removed user",
        email: null,
      };
}

function formatDateTime(
  date: Date,
  timeZone: string,
) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
  }).format(date);
}

function createRecord({
  id,
  category,
  action,
  summary,
  actor,
  resource,
  source,
  createdAt,
  timeZone,
}: {
  id: string;
  category: AuditLogRecordCategory;
  action: string;
  summary: string;
  actor: AuditActor;
  resource: AuditLogRecord["resource"];
  source: string;
  createdAt: Date;
  timeZone: string;
}): AuditLogRecord {
  return {
    id: `${category.toLowerCase()}:${id}`,
    category,
    categoryLabel:
      category === "MEMBER"
        ? "Member"
        : formatEnum(category),
    action,
    summary,
    actor: mapActor(actor),
    resource,
    source,
    occurredAt: formatDateTime(
      createdAt,
      timeZone,
    ),
    occurredAtIso:
      createdAt.toISOString(),
  };
}

function formatTicketAction(
  event: TicketAuditEvent,
) {
  switch (event.action) {
    case "TICKET_CREATED":
      {
        const priority = getString(
          event.metadata,
          "priority",
        );

      return {
        action: "Ticket created",
        summary: priority
          ? `Created with ${formatEnum(
              priority,
            ).toLowerCase()} priority.`
          : "Ticket was created.",
      };
      }

    case "ASSIGNEE_CHANGED":
      return {
        action: "Assignee changed",
        summary: `Assignee: ${
          event.fromValue ?? "Unassigned"
        } → ${
          event.toValue ?? "Unassigned"
        }.`,
      };

    case "STATUS_CHANGED":
      return {
        action: "Status changed",
        summary: `Status: ${formatEnum(
          event.fromValue,
        )} → ${formatEnum(
          event.toValue,
        )}.`,
      };

    case "APPROVAL_REQUESTED":
      return {
        action: "Approval requested",
        summary: `Requested approval from ${
          event.toValue ?? "an approver"
        }. Ticket status: ${formatEnum(
          event.fromValue,
        )} → Waiting approval.`,
      };

    case "APPROVAL_DECIDED": {
      const nextTicketStatus =
        getString(
          event.metadata,
          "nextTicketStatus",
        );
      const approved =
        event.toValue === "APPROVED";

      return {
        action: approved
          ? "Service request approved"
          : "Service request rejected",
        summary: `Approval: Pending → ${formatEnum(
          event.toValue,
        )}. Ticket status: Waiting approval → ${formatEnum(
          nextTicketStatus,
        )}.`,
      };
    }

    case "COMMENT_ADDED": {
      const isInternal =
        event.toValue === "INTERNAL";

      return {
        action: isInternal
          ? "Internal note added"
          : "Public reply added",
        summary: isInternal
          ? "Added an internal note. Its content remains available only in the ticket workspace."
          : "Added a public reply to the ticket conversation.",
      };
    }

    default:
      return {
        action: formatEnum(event.action),
        summary:
          "Updated this ticket.",
      };
  }
}

export function formatTicketAuditEvent(
  event: TicketAuditEvent,
  timeZone: string,
) {
  const activity =
    formatTicketAction(event);
  const reference = `${
    event.ticket.type === "INCIDENT"
      ? "INC"
      : "REQ"
  }-${event.ticket.number}`;

  return createRecord({
    id: event.id,
    category: "TICKET",
    ...activity,
    actor: event.actor,
    resource: {
      label: `${reference} · ${event.ticket.title}`,
      href: `/tickets/${event.ticket.id}`,
    },
    source: formatSource(
      event.metadata,
      "Ticket workspace",
    ),
    createdAt: event.createdAt,
    timeZone,
  });
}

function formatAssetAction(
  event: AssetAuditEvent,
) {
  if (event.action === "STATUS_CHANGED") {
    return {
      action: "Asset status changed",
      summary: `Status: ${formatEnum(
        event.fromValue,
      )} → ${formatEnum(
        event.toValue,
      )}.`,
    };
  }

  if (
    event.action ===
    "ASSIGNMENT_CHANGED"
  ) {
    return {
      action: "Asset assignment changed",
      summary: `Assigned member: ${
        event.fromValue ?? "Unassigned"
      } → ${
        event.toValue ?? "Unassigned"
      }.`,
    };
  }

  return {
    action: formatEnum(event.action),
    summary: "Updated this asset.",
  };
}

export function formatAssetAuditEvent(
  event: AssetAuditEvent,
  timeZone: string,
) {
  return createRecord({
    id: event.id,
    category: "ASSET",
    ...formatAssetAction(event),
    actor: event.actor,
    resource: {
      label: `${event.asset.assetTag} · ${event.asset.name}`,
      href: `/assets?asset=${encodeURIComponent(
        event.asset.id,
      )}`,
    },
    source: formatSource(
      event.metadata,
      "Asset inventory",
    ),
    createdAt: event.createdAt,
    timeZone,
  });
}

function formatKnowledgeAction(
  event: KnowledgeAuditEvent,
) {
  switch (event.action) {
    case "KNOWLEDGE_ARTICLE_CREATED":
      return {
        action: "Knowledge article created",
        summary:
          "Created a new private draft.",
      };

    case "KNOWLEDGE_ARTICLE_UPDATED": {
      const fields = getStringArray(
        event.metadata,
        "changedFields",
      );

      return {
        action: "Knowledge article updated",
        summary:
          fields.length > 0
            ? `Updated ${fields.join(
                ", ",
              )}.`
            : "Updated the article content.",
      };
    }

    case "KNOWLEDGE_ARTICLE_STATUS_CHANGED": {
      const previousStatus = getString(
        event.fromValue,
        "status",
      );
      const nextStatus = getString(
        event.toValue,
        "status",
      );

      return {
        action: "Knowledge status changed",
        summary: `Status: ${formatEnum(
          previousStatus,
        )} → ${formatEnum(
          nextStatus,
        )}.`,
      };
    }

    default:
      return {
        action: formatEnum(event.action),
        summary:
          "Updated this knowledge article.",
      };
  }
}

export function formatKnowledgeAuditEvent(
  event: KnowledgeAuditEvent,
  timeZone: string,
) {
  return createRecord({
    id: event.id,
    category: "KNOWLEDGE",
    ...formatKnowledgeAction(event),
    actor: event.actor,
    resource: {
      label: `${event.article.category} · ${event.article.title}`,
      href: `/knowledge/${event.article.id}`,
    },
    source: formatSource(
      event.metadata,
      "Knowledge base",
    ),
    createdAt: event.createdAt,
    timeZone,
  });
}

type MembershipSnapshot = {
  role: string | null;
  status: string | null;
  department: string | null;
};

function membershipSnapshot(
  value: unknown,
): MembershipSnapshot {
  return {
    role: getString(value, "role"),
    status: getString(value, "status"),
    department:
      getString(value, "department"),
  };
}

function formatMembershipValue(
  field: keyof MembershipSnapshot,
  value: string | null,
) {
  if (field === "department") {
    return value || "None";
  }

  return formatEnum(value);
}

function formatMembershipChanges(
  event: MembershipAuditEvent,
) {
  const previous = membershipSnapshot(
    event.fromValue,
  );
  const next = membershipSnapshot(
    event.toValue,
  );
  const changes: string[] = [];

  for (const field of [
    "role",
    "status",
    "department",
  ] as const) {
    if (previous[field] !== next[field]) {
      changes.push(
        `${formatEnum(
          field,
        )}: ${formatMembershipValue(
          field,
          previous[field],
        )} → ${formatMembershipValue(
          field,
          next[field],
        )}`,
      );
    }
  }

  return changes.length > 0
    ? `${changes.join(" · ")}.`
    : "Membership details changed.";
}

export function formatMembershipAuditEvent(
  event: MembershipAuditEvent,
  timeZone: string,
) {
  return createRecord({
    id: event.id,
    category: "MEMBER",
    action:
      event.action === "MEMBERSHIP_UPDATED"
        ? "Membership updated"
        : formatEnum(event.action),
    summary:
      formatMembershipChanges(event),
    actor: event.actor,
    resource: {
      label: `${event.membership.user.name} · ${event.membership.user.email}`,
      href: `/people?member=${encodeURIComponent(
        event.membership.id,
      )}`,
    },
    source: formatSource(
      event.metadata,
      "People directory",
    ),
    createdAt: event.createdAt,
    timeZone,
  });
}

export function formatWorkspaceAuditEvent(
  event: WorkspaceAuditEvent,
  timeZone: string,
) {
  const changedFields =
    getStringArray(
      event.metadata,
      "changedFields",
    );

  return createRecord({
    id: event.id,
    category: "WORKSPACE",
    action:
      event.action ===
      "WORKSPACE_SETTINGS_UPDATED"
        ? "Workspace settings updated"
        : formatEnum(event.action),
    summary:
      changedFields.length > 0
        ? `Updated ${changedFields.join(
            ", ",
          )}.`
        : "Workspace configuration changed.",
    actor: event.actor,
    resource: {
      label: event.organization.name,
      href: "/settings",
    },
    source: formatSource(
      event.metadata,
      "Workspace settings",
    ),
    createdAt: event.createdAt,
    timeZone,
  });
}
