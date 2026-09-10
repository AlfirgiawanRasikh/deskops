export const auditLogCategoryValues = [
  "ALL",
  "TICKET",
  "ASSET",
  "MEMBER",
  "WORKSPACE",
] as const;

export const auditLogRangeValues = [
  "7d",
  "30d",
  "90d",
] as const;

export type AuditLogCategory =
  (typeof auditLogCategoryValues)[number];

export type AuditLogRecordCategory =
  Exclude<AuditLogCategory, "ALL">;

export type AuditLogRange =
  (typeof auditLogRangeValues)[number];

export type AuditLogSearchParams = {
  q?: string | string[];
  category?: string | string[];
  actor?: string | string[];
  range?: string | string[];
  page?: string | string[];
};

export type AuditLogQuery = {
  query: string;
  category: AuditLogCategory;
  actorId: string;
  range: AuditLogRange;
  page: number;
};

export type AuditLogRecord = {
  id: string;
  category: AuditLogRecordCategory;
  categoryLabel: string;
  action: string;
  summary: string;
  actor: {
    id: string | null;
    name: string;
    email: string | null;
  };
  resource: {
    label: string;
    href: string;
  };
  source: string;
  occurredAt: string;
  occurredAtIso: string;
};

export type AuditLogActorOption = {
  value: string;
  label: string;
};

export type AuditLogMetric = {
  label: string;
  value: number;
  description: string;
};

export type AuditLogPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  firstItem: number;
  lastItem: number;
};

export type AuditLogData = {
  organizationName: string;
  generatedAt: string;
  query: AuditLogQuery;
  records: AuditLogRecord[];
  actorOptions: AuditLogActorOption[];
  metrics: AuditLogMetric[];
  pagination: AuditLogPagination;
};
