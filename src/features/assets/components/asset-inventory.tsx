"use client";

import {
  Laptop,
  Search,
  ShieldCheck,
  Ticket,
  UserRound,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import type {
  AssetInventoryData,
  AssetInventoryRecord,
  AssetInventoryStatus,
} from "@/features/assets/types/asset-inventory";

const statusOptions: Array<
  | AssetInventoryStatus
  | "All statuses"
> = [
  "All statuses",
  "In stock",
  "Assigned",
  "In repair",
  "Retired",
  "Lost",
];

function getStatusDotClass(
  status: AssetInventoryStatus,
) {
  switch (status) {
    case "Assigned":
      return "bg-accent";

    case "In repair":
      return "bg-warning";

    case "Lost":
      return "bg-danger";

    case "Retired":
      return "bg-[#98a2b3]";

    default:
      return "bg-success";
  }
}

function getWarrantyClass(
  asset: AssetInventoryRecord,
) {
  switch (asset.warrantyState) {
    case "expired":
      return "text-danger";

    case "expiring":
      return "text-warning";

    default:
      return "text-muted";
  }
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-[11px] text-muted">
        {label}
      </dt>

      <dd className="max-w-[190px] text-right text-[12px] font-medium text-ink">
        {value}
      </dd>
    </div>
  );
}

export function AssetInventory({
  data,
}: {
  data: AssetInventoryData;
}) {
  const [query, setQuery] =
    useState("");

  const [status, setStatus] =
    useState<
      | AssetInventoryStatus
      | "All statuses"
    >("All statuses");

  const [
    selectedAssetId,
    setSelectedAssetId,
  ] = useState<string | null>(
    data.records[0]?.databaseId ??
      null,
  );

  const filteredAssets =
    useMemo(() => {
      const normalizedQuery =
        query.trim().toLowerCase();

      return data.records.filter(
        (asset) => {
          const matchesStatus =
            status === "All statuses" ||
            asset.status === status;

          if (!normalizedQuery) {
            return matchesStatus;
          }

          const searchableText = [
            asset.assetTag,
            asset.name,
            asset.type,
            asset.serialNumber,
            asset.manufacturer,
            asset.model,
            asset.assignedTo?.name,
            asset.assignedTo?.email,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return (
            matchesStatus &&
            searchableText.includes(
              normalizedQuery,
            )
          );
        },
      );
    }, [
      data.records,
      query,
      status,
    ]);

  const selectedAsset =
    filteredAssets.find(
      (asset) =>
        asset.databaseId ===
        selectedAssetId,
    ) ??
    filteredAssets[0] ??
    null;

  return (
    <main className="mx-auto max-w-[1480px] p-4 sm:p-6">
      <header className="flex flex-col gap-2 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium text-muted">
            {data.organizationName}
          </p>

          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">
            {data.title}
          </h1>

          <p className="mt-1.5 max-w-[760px] text-[13px] leading-5 text-muted">
            {data.description}
          </p>
        </div>

        <p className="text-[11px] text-muted">
          Read-only inventory
        </p>
      </header>

      <section
        aria-label="Asset summary"
        className="mt-5 grid overflow-hidden rounded-[6px] border border-line bg-surface sm:grid-cols-2 xl:grid-cols-4"
      >
        {data.metrics.map((metric) => (
          <div
            className="border-b border-line px-4 py-3 last:border-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"
            key={metric.label}
          >
            <p className="text-[11px] text-muted">
              {metric.label}
            </p>

            <p className="mt-1 text-[20px] font-semibold tabular-nums text-ink">
              {metric.value}
            </p>

            <p className="mt-0.5 text-[10px] text-muted">
              {metric.description}
            </p>
          </div>
        ))}
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 overflow-hidden rounded-[6px] border border-line bg-surface">
          <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <span className="sr-only">
                Search assets
              </span>

              <Search
                aria-hidden="true"
                className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
                strokeWidth={1.8}
              />

              <input
                className="h-8 w-full rounded-[5px] border border-line bg-canvas pl-8 pr-3 text-[12px] text-ink outline-none placeholder:text-[#98a2b3] focus:border-accent focus:bg-white"
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
                placeholder="Search tag, device, serial, or assignee"
                type="search"
                value={query}
              />
            </label>

            <label>
              <span className="sr-only">
                Filter by status
              </span>

              <select
                className="h-8 w-full rounded-[5px] border border-line bg-surface px-2.5 text-[12px] text-ink outline-none focus:border-accent sm:w-[150px]"
                onChange={(event) =>
                  setStatus(
                    event.target
                      .value as
                      | AssetInventoryStatus
                      | "All statuses",
                  )
                }
                value={status}
              >
                {statusOptions.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead className="bg-[#fafbfc] text-[10px] font-medium uppercase tracking-[0.04em] text-muted">
                <tr>
                  <th className="px-4 py-2.5">
                    Asset
                  </th>

                  <th className="px-3 py-2.5">
                    Type
                  </th>

                  <th className="px-3 py-2.5">
                    Status
                  </th>

                  <th className="px-3 py-2.5">
                    Assigned to
                  </th>

                  <th className="px-3 py-2.5">
                    Warranty
                  </th>

                  <th className="px-4 py-2.5 text-right">
                    Open work
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {filteredAssets.length >
                0 ? (
                  filteredAssets.map(
                    (asset) => {
                      const isSelected =
                        selectedAsset
                          ?.databaseId ===
                        asset.databaseId;

                      return (
                        <tr
                          className={
                            isSelected
                              ? "bg-selected"
                              : "hover:bg-[#fafbfc]"
                          }
                          key={
                            asset.databaseId
                          }
                        >
                          <td className="px-4 py-3">
                            <button
                              className="block max-w-[260px] text-left"
                              onClick={() =>
                                setSelectedAssetId(
                                  asset.databaseId,
                                )
                              }
                              type="button"
                            >
                              <span className="block truncate text-[12px] font-medium text-ink">
                                {asset.name}
                              </span>

                              <span className="mt-0.5 block truncate text-[10px] tabular-nums text-muted">
                                {
                                  asset.assetTag
                                }
                                {asset.serialNumber
                                  ? ` · ${asset.serialNumber}`
                                  : ""}
                              </span>
                            </button>
                          </td>

                          <td className="px-3 py-3 text-[12px] text-[#4c5563]">
                            {asset.type}
                          </td>

                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-[#4c5563]">
                              <span
                                className={`size-1.5 rounded-full ${getStatusDotClass(
                                  asset.status,
                                )}`}
                              />

                              {asset.status}
                            </span>
                          </td>

                          <td className="px-3 py-3">
                            <p className="max-w-[180px] truncate text-[11px] text-[#4c5563]">
                              {asset
                                .assignedTo
                                ?.name ??
                                "Unassigned"}
                            </p>
                          </td>

                          <td
                            className={`px-3 py-3 text-[11px] ${getWarrantyClass(
                              asset,
                            )}`}
                          >
                            {
                              asset.warrantyLabel
                            }
                          </td>

                          <td className="px-4 py-3 text-right text-[11px] tabular-nums text-[#4c5563]">
                            {
                              asset.openTicketCount
                            }
                          </td>
                        </tr>
                      );
                    },
                  )
                ) : (
                  <tr>
                    <td
                      className="px-4 py-14 text-center"
                      colSpan={6}
                    >
                      <Laptop
                        aria-hidden="true"
                        className="mx-auto size-5 text-[#98a2b3]"
                        strokeWidth={1.6}
                      />

                      <p className="mt-2 text-[12px] font-medium text-ink">
                        No matching assets
                      </p>

                      <p className="mt-1 text-[11px] text-muted">
                        Change the search or
                        status filter.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="border-t border-line px-4 py-2.5 text-[10px] text-muted">
            Showing {filteredAssets.length}{" "}
            of {data.records.length} visible
            assets
          </footer>
        </section>

        <aside className="self-start overflow-hidden rounded-[6px] border border-line bg-surface xl:sticky xl:top-[72px]">
          {selectedAsset ? (
            <>
              <div className="border-b border-line px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-[5px] bg-selected text-accent">
                    <Laptop
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={1.8}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {selectedAsset.name}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] tabular-nums text-muted">
                      {
                        selectedAsset.assetTag
                      }
                    </p>
                  </div>
                </div>
              </div>

              <dl className="px-4">
                <DetailRow
                  label="Status"
                  value={
                    selectedAsset.status
                  }
                />

                <DetailRow
                  label="Type"
                  value={selectedAsset.type}
                />

                <DetailRow
                  label="Manufacturer"
                  value={
                    selectedAsset.manufacturer ??
                    "Not recorded"
                  }
                />

                <DetailRow
                  label="Model"
                  value={
                    selectedAsset.model ??
                    "Not recorded"
                  }
                />

                <DetailRow
                  label="Serial number"
                  value={
                    selectedAsset.serialNumber ??
                    "Not recorded"
                  }
                />

                <DetailRow
                  label="Purchase date"
                  value={
                    selectedAsset.purchaseDate ??
                    "Not recorded"
                  }
                />
              </dl>

              <div className="border-t border-line px-4 py-4">
                <div className="flex items-center gap-2">
                  <UserRound
                    aria-hidden="true"
                    className="size-3.5 text-muted"
                    strokeWidth={1.8}
                  />

                  <p className="text-[11px] font-medium text-ink">
                    Assignment
                  </p>
                </div>

                <p className="mt-2 text-[12px] text-[#4c5563]">
                  {selectedAsset
                    .assignedTo?.name ??
                    "Unassigned"}
                </p>

                {selectedAsset.assignedTo ? (
                  <p className="mt-0.5 truncate text-[10px] text-muted">
                    {
                      selectedAsset
                        .assignedTo.email
                    }
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 border-t border-line">
                <div className="border-r border-line px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted">
                    <ShieldCheck
                      aria-hidden="true"
                      className="size-3"
                      strokeWidth={1.8}
                    />

                    Warranty
                  </div>

                  <p
                    className={`mt-1 text-[11px] font-medium ${getWarrantyClass(
                      selectedAsset,
                    )}`}
                  >
                    {
                      selectedAsset.warrantyLabel
                    }
                  </p>
                </div>

                <div className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted">
                    <Ticket
                      aria-hidden="true"
                      className="size-3"
                      strokeWidth={1.8}
                    />

                    Open work
                  </div>

                  <p className="mt-1 text-[11px] font-medium tabular-nums text-ink">
                    {
                      selectedAsset.openTicketCount
                    }{" "}
                    {selectedAsset.openTicketCount ===
                    1
                      ? "ticket"
                      : "tickets"}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="px-5 py-12 text-center">
              <Laptop
                aria-hidden="true"
                className="mx-auto size-5 text-[#98a2b3]"
                strokeWidth={1.6}
              />

              <p className="mt-2 text-[12px] text-muted">
                No asset is available in
                your current scope.
              </p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}