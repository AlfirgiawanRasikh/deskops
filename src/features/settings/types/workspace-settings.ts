import type {
  ServiceLevelPriority,
  ServiceLevelTarget,
} from "@/features/settings/constants/service-level-policies";

export type WorkspaceSettingsField =
  | "name"
  | "timezone"
  | "urgentFirstResponseMinutes"
  | "urgentResolutionMinutes"
  | "highFirstResponseMinutes"
  | "highResolutionMinutes"
  | "normalFirstResponseMinutes"
  | "normalResolutionMinutes"
  | "lowFirstResponseMinutes"
  | "lowResolutionMinutes";

export type WorkspaceSettingsFieldErrors =
  Partial<
    Record<
      WorkspaceSettingsField,
      string[]
    >
  >;

export type WorkspaceSettingsActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: WorkspaceSettingsFieldErrors;
};

export const initialWorkspaceSettingsActionState:
  WorkspaceSettingsActionState = {
    status: "idle",
    message: "",
    fieldErrors: {},
  };

export type WorkspaceServiceLevelPolicy =
  ServiceLevelTarget & {
    priority: ServiceLevelPriority;
    priorityLabel: string;
    firstResponseLabel: string;
    resolutionLabel: string;
  };

export type WorkspaceSettingsEvent = {
  id: string;
  action: string;
  summary: string;
  actorName: string;
  occurredAt: string;
};

export type WorkspaceSettingsData = {
  organization: {
    name: string;
    slug: string;
    timezone: string;
  };
  serviceLevelPolicies: WorkspaceServiceLevelPolicy[];
  recentActivity: WorkspaceSettingsEvent[];
  capabilities: {
    canUpdate: boolean;
  };
};
