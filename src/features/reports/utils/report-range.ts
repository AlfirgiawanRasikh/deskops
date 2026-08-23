import type { OperationalReportRange } from "@/features/reports/types/operational-report";

const rangeConfiguration: Record<
  OperationalReportRange,
  {
    days: number;
    bucketDays: number;
    label: string;
  }
> = {
  "7d": {
    days: 7,
    bucketDays: 1,
    label: "Last 7 days",
  },
  "30d": {
    days: 30,
    bucketDays: 3,
    label: "Last 30 days",
  },
  "90d": {
    days: 90,
    bucketDays: 7,
    label: "Last 90 days",
  },
};

export function parseOperationalReportRange(
  value: string | string[] | undefined,
): OperationalReportRange {
  const normalizedValue =
    Array.isArray(value) ? value[0] : value;

  if (
    normalizedValue === "7d" ||
    normalizedValue === "90d"
  ) {
    return normalizedValue;
  }

  return "30d";
}

export function getOperationalReportRangeConfiguration(
  range: OperationalReportRange,
) {
  return rangeConfiguration[range];
}
