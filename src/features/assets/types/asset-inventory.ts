export type AssetStatusValue =
  | "IN_STOCK"
  | "ASSIGNED"
  | "IN_REPAIR"
  | "RETIRED"
  | "LOST";

export type AssetInventoryStatus =
  | "In stock"
  | "Assigned"
  | "In repair"
  | "Retired"
  | "Lost";

export type AssetWarrantyState =
  | "active"
  | "expiring"
  | "expired"
  | "none";

export type AssetMemberOption = {
  id: string;
  name: string;
  email: string;
  department: string;
};

export type AssetActivityRecord = {
  id: string;
  description: string;
  actorName: string;
  createdAt: string;
};

export type AssetInventoryRecord = {
  databaseId: string;
  assetTag: string;
  name: string;
  type: string;
  status: AssetInventoryStatus;
  statusValue: AssetStatusValue;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  purchaseDate: string | null;
  warrantyLabel: string;
  warrantyState: AssetWarrantyState;
  openTicketCount: number;
  activity: AssetActivityRecord[];
};

export type AssetInventoryMetric = {
  label: string;
  value: number;
  description: string;
};

export type AssetInventoryData = {
  title: string;
  description: string;
  organizationName: string;
  records: AssetInventoryRecord[];
  metrics: AssetInventoryMetric[];
  memberOptions: AssetMemberOption[];
  capabilities: {
    canAssignAssets: boolean;
    canUpdateAssetStatus: boolean;
    canViewAuditHistory: boolean;
  };
};