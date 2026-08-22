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

export type AssetInventoryRecord = {
  databaseId: string;
  assetTag: string;
  name: string;
  type: string;
  status: AssetInventoryStatus;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  assignedTo: {
    name: string;
    email: string;
  } | null;
  purchaseDate: string | null;
  warrantyLabel: string;
  warrantyState: AssetWarrantyState;
  openTicketCount: number;
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
};