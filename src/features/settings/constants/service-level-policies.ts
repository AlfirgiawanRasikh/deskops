export const serviceLevelPriorities = [
  "URGENT",
  "HIGH",
  "NORMAL",
  "LOW",
] as const;

export type ServiceLevelPriority =
  (typeof serviceLevelPriorities)[number];

export type ServiceLevelTarget = {
  firstResponseMinutes: number;
  resolutionMinutes: number;
};

export const defaultServiceLevelPolicies = {
  URGENT: {
    firstResponseMinutes: 15,
    resolutionMinutes: 30,
  },
  HIGH: {
    firstResponseMinutes: 30,
    resolutionMinutes: 240,
  },
  NORMAL: {
    firstResponseMinutes: 120,
    resolutionMinutes: 480,
  },
  LOW: {
    firstResponseMinutes: 240,
    resolutionMinutes: 2880,
  },
} as const satisfies Record<
  ServiceLevelPriority,
  ServiceLevelTarget
>;

export const workspaceTimeZones = [
  "UTC",
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
] as const;

export const workspaceTimeZoneLabels = {
  UTC: "UTC",
  "Asia/Jakarta": "Jakarta (WIB)",
  "Asia/Makassar": "Makassar (WITA)",
  "Asia/Jayapura": "Jayapura (WIT)",
  "Asia/Singapore": "Singapore",
  "Asia/Kuala_Lumpur": "Kuala Lumpur",
  "Asia/Tokyo": "Tokyo",
  "Australia/Sydney": "Sydney",
  "Europe/London": "London",
  "America/New_York": "New York",
  "America/Los_Angeles": "Los Angeles",
} as const satisfies Record<
  (typeof workspaceTimeZones)[number],
  string
>;

export const serviceLevelFieldNames = {
  URGENT: {
    firstResponse:
      "urgentFirstResponseMinutes",
    resolution:
      "urgentResolutionMinutes",
  },
  HIGH: {
    firstResponse:
      "highFirstResponseMinutes",
    resolution:
      "highResolutionMinutes",
  },
  NORMAL: {
    firstResponse:
      "normalFirstResponseMinutes",
    resolution:
      "normalResolutionMinutes",
  },
  LOW: {
    firstResponse:
      "lowFirstResponseMinutes",
    resolution:
      "lowResolutionMinutes",
  },
} as const satisfies Record<
  ServiceLevelPriority,
  {
    firstResponse: string;
    resolution: string;
  }
>;
