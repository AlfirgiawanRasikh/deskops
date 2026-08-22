import type { WorkspaceRole } from "@/features/auth/policies/workspace-authorization";

export type PeopleMembershipStatus =
  | "Invited"
  | "Active"
  | "Suspended";

export type PeopleMembershipStatusValue =
  | "INVITED"
  | "ACTIVE"
  | "SUSPENDED";

export type PeopleMembershipEvent = {
  id: string;
  action: string;
  summary: string;
  actorName: string;
  occurredAt: string;
};

export type PeopleRecord = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: WorkspaceRole;
  roleLabel: string;
  membershipStatus: PeopleMembershipStatusValue;
  status: PeopleMembershipStatus;
  department: string;
  departmentValue: string;
  joinedAt: string;
  openRequestedTickets: number;
  openAssignedTickets: number;
  assignedAssets: number;
  isCurrentUser: boolean;
  canManage: boolean;
  assignableRoles: WorkspaceRole[];
  recentEvents: PeopleMembershipEvent[];
};

export type PeopleDirectoryMetric = {
  label: string;
  value: number;
  description: string;
};

export type PeopleDirectoryData = {
  organizationName: string;
  records: PeopleRecord[];
  metrics: PeopleDirectoryMetric[];
};