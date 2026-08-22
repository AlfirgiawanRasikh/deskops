import type { WorkspaceRole } from "@/features/auth/policies/workspace-authorization";

export type PeopleMembershipStatus =
  | "Invited"
  | "Active"
  | "Suspended";

export type PeopleRecord = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: WorkspaceRole;
  roleLabel: string;
  status: PeopleMembershipStatus;
  department: string;
  joinedAt: string;
  openRequestedTickets: number;
  openAssignedTickets: number;
  assignedAssets: number;
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