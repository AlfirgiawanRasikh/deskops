"use client";

import {
  Laptop,
  Search,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import type {
  PeopleDirectoryData,
  PeopleMembershipStatus,
  PeopleRecord,
} from "@/features/people/types/people-directory";

type RoleFilter =
  | PeopleRecord["role"]
  | "ALL";

type StatusFilter =
  | PeopleMembershipStatus
  | "All statuses";

const roleOptions: Array<{
  value: RoleFilter;
  label: string;
}> = [
  {
    value: "ALL",
    label: "All roles",
  },
  {
    value: "OWNER",
    label: "Owner",
  },
  {
    value: "ADMIN",
    label: "Admin",
  },
  {
    value: "MANAGER",
    label: "Manager",
  },
  {
    value: "TECHNICIAN",
    label: "Technician",
  },
  {
    value: "EMPLOYEE",
    label: "Employee",
  },
];

const statusOptions: StatusFilter[] = [
  "All statuses",
  "Active",
  "Invited",
  "Suspended",
];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) => part.charAt(0),
    )
    .join("")
    .toUpperCase();
}

function getStatusDotClass(
  status: PeopleMembershipStatus,
) {
  switch (status) {
    case "Suspended":
      return "bg-danger";

    case "Invited":
      return "bg-warning";

    default:
      return "bg-success";
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

export function PeopleDirectory({
  data,
}: {
  data: PeopleDirectoryData;
}) {
  const [query, setQuery] =
    useState("");

  const [role, setRole] =
    useState<RoleFilter>("ALL");

  const [status, setStatus] =
    useState<StatusFilter>(
      "All statuses",
    );

  const [
    selectedMembershipId,
    setSelectedMembershipId,
  ] = useState<string | null>(
    data.records[0]?.membershipId ??
      null,
  );

  const filteredPeople =
    useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLowerCase();

      return data.records.filter(
        (person) => {
          const matchesRole =
            role === "ALL" ||
            person.role === role;

          const matchesStatus =
            status ===
              "All statuses" ||
            person.status === status;

          if (!normalizedQuery) {
            return (
              matchesRole &&
              matchesStatus
            );
          }

          const searchableText = [
            person.name,
            person.email,
            person.department,
            person.roleLabel,
          ]
            .join(" ")
            .toLowerCase();

          return (
            matchesRole &&
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
      role,
      status,
    ]);

  const selectedPerson =
    filteredPeople.find(
      (person) =>
        person.membershipId ===
        selectedMembershipId,
    ) ??
    filteredPeople[0] ??
    null;

  return (
    <main className="mx-auto max-w-[1480px] p-4 sm:p-6">
      <header className="flex flex-col gap-2 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium text-muted">
            {data.organizationName}
          </p>

          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">
            People
          </h1>

          <p className="mt-1.5 max-w-[760px] text-[13px] leading-5 text-muted">
            Workspace membership,
            access state, operational
            workload, and assigned
            devices.
          </p>
        </div>

        <p className="text-[11px] text-muted">
          Directory view
        </p>
      </header>

      <section
        aria-label="People summary"
        className="mt-5 grid overflow-hidden rounded-[6px] border border-line bg-surface sm:grid-cols-2 xl:grid-cols-4"
      >
        {data.metrics.map(
          (metric) => (
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
          ),
        )}
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 overflow-hidden rounded-[6px] border border-line bg-surface">
          <div className="flex flex-col gap-2 border-b border-line p-3 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <span className="sr-only">
                Search people
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
                placeholder="Search name, email, department, or role"
                type="search"
                value={query}
              />
            </label>

            <select
              aria-label="Filter by role"
              className="h-8 rounded-[5px] border border-line bg-surface px-2.5 text-[12px] text-ink outline-none focus:border-accent"
              onChange={(event) =>
                setRole(
                  event.target
                    .value as
                    RoleFilter,
                )
              }
              value={role}
            >
              {roleOptions.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>

            <select
              aria-label="Filter by status"
              className="h-8 rounded-[5px] border border-line bg-surface px-2.5 text-[12px] text-ink outline-none focus:border-accent"
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as
                    StatusFilter,
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
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead className="bg-[#fafbfc] text-[10px] font-medium uppercase tracking-[0.04em] text-muted">
                <tr>
                  <th className="px-4 py-2.5">
                    Member
                  </th>

                  <th className="px-3 py-2.5">
                    Role
                  </th>

                  <th className="px-3 py-2.5">
                    Department
                  </th>

                  <th className="px-3 py-2.5">
                    Status
                  </th>

                  <th className="px-3 py-2.5 text-right">
                    Open work
                  </th>

                  <th className="px-4 py-2.5 text-right">
                    Assets
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {filteredPeople.length >
                0 ? (
                  filteredPeople.map(
                    (person) => {
                      const isSelected =
                        selectedPerson
                          ?.membershipId ===
                        person.membershipId;

                      return (
                        <tr
                          className={
                            isSelected
                              ? "bg-selected"
                              : "hover:bg-[#fafbfc]"
                          }
                          key={
                            person.membershipId
                          }
                        >
                          <td className="px-4 py-3">
                            <button
                              className="flex max-w-[260px] items-center gap-2.5 text-left"
                              onClick={() =>
                                setSelectedMembershipId(
                                  person.membershipId,
                                )
                              }
                              type="button"
                            >
                              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#dce2ea] text-[10px] font-semibold text-[#364152]">
                                {getInitials(
                                  person.name,
                                )}
                              </span>

                              <span className="min-w-0">
                                <span className="block truncate text-[12px] font-medium text-ink">
                                  {
                                    person.name
                                  }
                                </span>

                                <span className="block truncate text-[10px] text-muted">
                                  {
                                    person.email
                                  }
                                </span>
                              </span>
                            </button>
                          </td>

                          <td className="px-3 py-3 text-[11px] text-[#4c5563]">
                            {
                              person.roleLabel
                            }
                          </td>

                          <td className="px-3 py-3 text-[11px] text-[#4c5563]">
                            {
                              person.department
                            }
                          </td>

                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-[#4c5563]">
                              <span
                                className={`size-1.5 rounded-full ${getStatusDotClass(
                                  person.status,
                                )}`}
                              />

                              {person.status}
                            </span>
                          </td>

                          <td className="px-3 py-3 text-right text-[11px] tabular-nums text-[#4c5563]">
                            {
                              person.openAssignedTickets
                            }
                          </td>

                          <td className="px-4 py-3 text-right text-[11px] tabular-nums text-[#4c5563]">
                            {
                              person.assignedAssets
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
                      <Users
                        aria-hidden="true"
                        className="mx-auto size-5 text-[#98a2b3]"
                        strokeWidth={1.6}
                      />

                      <p className="mt-2 text-[12px] font-medium text-ink">
                        No matching
                        members
                      </p>

                      <p className="mt-1 text-[11px] text-muted">
                        Change the search
                        or directory
                        filters.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="border-t border-line px-4 py-2.5 text-[10px] text-muted">
            Showing{" "}
            {filteredPeople.length} of{" "}
            {data.records.length}{" "}
            workspace members
          </footer>
        </section>

        <aside className="self-start overflow-hidden rounded-[6px] border border-line bg-surface xl:sticky xl:top-[72px]">
          {selectedPerson ? (
            <>
              <div className="border-b border-line px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-selected text-[12px] font-semibold text-accent">
                    {getInitials(
                      selectedPerson.name,
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {
                        selectedPerson.name
                      }
                    </p>

                    <p className="mt-0.5 truncate text-[10px] text-muted">
                      {
                        selectedPerson.email
                      }
                    </p>
                  </div>
                </div>
              </div>

              <dl className="px-4">
                <DetailRow
                  label="Role"
                  value={
                    selectedPerson.roleLabel
                  }
                />

                <DetailRow
                  label="Status"
                  value={
                    selectedPerson.status
                  }
                />

                <DetailRow
                  label="Department"
                  value={
                    selectedPerson.department
                  }
                />

                <DetailRow
                  label="Member since"
                  value={
                    selectedPerson.joinedAt
                  }
                />
              </dl>

              <div className="grid grid-cols-3 border-t border-line">
                <div className="border-r border-line px-3 py-3 text-center">
                  <Ticket
                    aria-hidden="true"
                    className="mx-auto size-3.5 text-muted"
                    strokeWidth={1.8}
                  />

                  <p className="mt-1 text-[13px] font-semibold tabular-nums text-ink">
                    {
                      selectedPerson.openAssignedTickets
                    }
                  </p>

                  <p className="text-[9px] text-muted">
                    Assigned
                  </p>
                </div>

                <div className="border-r border-line px-3 py-3 text-center">
                  <UserRound
                    aria-hidden="true"
                    className="mx-auto size-3.5 text-muted"
                    strokeWidth={1.8}
                  />

                  <p className="mt-1 text-[13px] font-semibold tabular-nums text-ink">
                    {
                      selectedPerson.openRequestedTickets
                    }
                  </p>

                  <p className="text-[9px] text-muted">
                    Requested
                  </p>
                </div>

                <div className="px-3 py-3 text-center">
                  <Laptop
                    aria-hidden="true"
                    className="mx-auto size-3.5 text-muted"
                    strokeWidth={1.8}
                  />

                  <p className="mt-1 text-[13px] font-semibold tabular-nums text-ink">
                    {
                      selectedPerson.assignedAssets
                    }
                  </p>

                  <p className="text-[9px] text-muted">
                    Assets
                  </p>
                </div>
              </div>

              <div className="border-t border-line bg-[#fafbfc] px-4 py-3">
                <p className="text-[10px] leading-4 text-muted">
                  Role and access
                  changes will be added
                  after the directory and
                  authorization checks
                  are verified.
                </p>
              </div>
            </>
          ) : (
            <div className="px-5 py-12 text-center">
              <Users
                aria-hidden="true"
                className="mx-auto size-5 text-[#98a2b3]"
                strokeWidth={1.6}
              />

              <p className="mt-2 text-[12px] text-muted">
                No member is available
                in this filter.
              </p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}