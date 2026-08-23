"use client";

import {
  Building2,
  Clock3,
  History,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
} from "react";

import {
  serviceLevelFieldNames,
  workspaceTimeZoneLabels,
  workspaceTimeZones,
} from "@/features/settings/constants/service-level-policies";
import { updateWorkspaceSettingsAction } from "@/features/settings/server/workspace-settings-actions";
import {
  initialWorkspaceSettingsActionState,
  type WorkspaceServiceLevelPolicy,
  type WorkspaceSettingsData,
  type WorkspaceSettingsField,
  type WorkspaceSettingsFieldErrors,
} from "@/features/settings/types/workspace-settings";

function FieldError({
  field,
  errors,
}: {
  field: WorkspaceSettingsField;
  errors: WorkspaceSettingsFieldErrors;
}) {
  const message = errors[field]?.[0];

  if (!message) {
    return null;
  }

  return (
    <p className="mt-1 text-[10px] leading-4 text-danger">
      {message}
    </p>
  );
}

function ServiceLevelRow({
  policy,
  disabled,
  errors,
}: {
  policy: WorkspaceServiceLevelPolicy;
  disabled: boolean;
  errors: WorkspaceSettingsFieldErrors;
}) {
  const fields =
    serviceLevelFieldNames[
      policy.priority
    ];

  return (
    <div className="grid gap-3 border-b border-line px-4 py-3 last:border-0 md:grid-cols-[minmax(150px,1fr)_minmax(150px,0.85fr)_minmax(150px,0.85fr)] md:items-start">
      <div>
        <p className="text-[11px] font-semibold text-ink">
          {policy.priorityLabel}
        </p>
        <p className="mt-0.5 text-[10px] text-muted">
          Current: {policy.firstResponseLabel} response · {policy.resolutionLabel} resolution
        </p>
      </div>

      <label>
        <span className="block text-[10px] font-medium text-muted">
          First response
        </span>
        <div className="relative mt-1">
          <input
            className="h-8 w-full rounded-[5px] border border-line bg-surface pl-2.5 pr-14 text-[11px] tabular-nums text-ink outline-none focus:border-accent disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-70"
            defaultValue={
              policy.firstResponseMinutes
            }
            disabled={disabled}
            max={43200}
            min={1}
            name={fields.firstResponse}
            required
            step={1}
            type="number"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted">
            minutes
          </span>
        </div>
        <FieldError
          errors={errors}
          field={fields.firstResponse}
        />
      </label>

      <label>
        <span className="block text-[10px] font-medium text-muted">
          Resolution
        </span>
        <div className="relative mt-1">
          <input
            className="h-8 w-full rounded-[5px] border border-line bg-surface pl-2.5 pr-14 text-[11px] tabular-nums text-ink outline-none focus:border-accent disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-70"
            defaultValue={
              policy.resolutionMinutes
            }
            disabled={disabled}
            max={43200}
            min={1}
            name={fields.resolution}
            required
            step={1}
            type="number"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted">
            minutes
          </span>
        </div>
        <FieldError
          errors={errors}
          field={fields.resolution}
        />
      </label>
    </div>
  );
}

function ActivityHistory({
  data,
}: {
  data: WorkspaceSettingsData;
}) {
  return (
    <section className="overflow-hidden rounded-[6px] border border-line bg-surface">
      <header className="flex items-start gap-2 border-b border-line px-4 py-3">
        <History
          aria-hidden="true"
          className="mt-0.5 size-3.5 text-muted"
          strokeWidth={1.8}
        />
        <div>
          <h2 className="text-[12px] font-semibold text-ink">
            Recent activity
          </h2>
          <p className="mt-0.5 text-[10px] text-muted">
            Latest audited settings changes
          </p>
        </div>
      </header>

      {data.recentActivity.length > 0 ? (
        <ol className="divide-y divide-line">
          {data.recentActivity.map(
            (event) => (
              <li
                className="px-4 py-3"
                key={event.id}
              >
                <p className="text-[10px] font-medium text-ink">
                  {event.action}
                </p>
                <p className="mt-1 text-[10px] leading-4 text-[#4c5563]">
                  {event.summary}
                </p>
                <p className="mt-1.5 text-[9px] text-muted">
                  {event.actorName} · {event.occurredAt}
                </p>
              </li>
            ),
          )}
        </ol>
      ) : (
        <div className="px-4 py-7 text-center">
          <p className="text-[10px] text-muted">
            No settings changes recorded.
          </p>
        </div>
      )}
    </section>
  );
}

export function WorkspaceSettings({
  data,
}: {
  data: WorkspaceSettingsData;
}) {
  const router = useRouter();

  const [state, formAction, isPending] =
    useActionState(
      updateWorkspaceSettingsAction,
      initialWorkspaceSettingsActionState,
    );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [
    router,
    state.message,
    state.status,
  ]);

  const isDisabled =
    isPending ||
    !data.capabilities.canUpdate;

  return (
    <main className="mx-auto max-w-[1480px] p-4 sm:p-6">
      <header className="border-b border-line pb-5">
        <p className="text-[11px] font-medium text-muted">
          {data.organization.name}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">
          Workspace settings
        </h1>
        <p className="mt-1.5 max-w-[760px] text-[13px] leading-5 text-muted">
          Organization identity, regional configuration, and service-level targets.
        </p>
      </header>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form
          action={formAction}
          className="space-y-4"
        >
          <section className="overflow-hidden rounded-[6px] border border-line bg-surface">
            <header className="flex items-start gap-2 border-b border-line px-4 py-3">
              <Building2
                aria-hidden="true"
                className="mt-0.5 size-3.5 text-muted"
                strokeWidth={1.8}
              />
              <div>
                <h2 className="text-[12px] font-semibold text-ink">
                  General
                </h2>
                <p className="mt-0.5 text-[10px] text-muted">
                  Workspace name and reporting timezone
                </p>
              </div>
            </header>

            <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
              <label>
                <span className="block text-[10px] font-medium text-muted">
                  Workspace name
                </span>
                <input
                  className="mt-1 h-8 w-full rounded-[5px] border border-line bg-surface px-2.5 text-[11px] text-ink outline-none focus:border-accent disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-70"
                  defaultValue={
                    data.organization.name
                  }
                  disabled={isDisabled}
                  maxLength={100}
                  name="name"
                  required
                  type="text"
                />
                <FieldError
                  errors={state.fieldErrors}
                  field="name"
                />
              </label>

              <label>
                <span className="block text-[10px] font-medium text-muted">
                  Timezone
                </span>
                <select
                  className="mt-1 h-8 w-full rounded-[5px] border border-line bg-surface px-2.5 text-[11px] text-ink outline-none focus:border-accent disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-70"
                  defaultValue={
                    data.organization.timezone
                  }
                  disabled={isDisabled}
                  name="timezone"
                >
                  {workspaceTimeZones.map(
                    (timezone) => (
                      <option
                        key={timezone}
                        value={timezone}
                      >
                        {
                          workspaceTimeZoneLabels[
                            timezone
                          ]
                        }
                      </option>
                    ),
                  )}
                </select>
                <FieldError
                  errors={state.fieldErrors}
                  field="timezone"
                />
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-[6px] border border-line bg-surface">
            <header className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2">
                <Clock3
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 text-muted"
                  strokeWidth={1.8}
                />
                <div>
                  <h2 className="text-[12px] font-semibold text-ink">
                    Service-level targets
                  </h2>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Due dates applied when new tickets are created
                  </p>
                </div>
              </div>

              <span className="self-start rounded-[4px] border border-line bg-canvas px-1.5 py-0.5 text-[9px] font-medium text-muted">
                Audited
              </span>
            </header>

            <div className="hidden grid-cols-[minmax(150px,1fr)_minmax(150px,0.85fr)_minmax(150px,0.85fr)] gap-3 border-b border-line bg-[#fafbfc] px-4 py-2 text-[9px] font-medium uppercase tracking-[0.04em] text-muted md:grid">
              <span>Priority</span>
              <span>First response</span>
              <span>Resolution</span>
            </div>

            {data.serviceLevelPolicies.map(
              (policy) => (
                <ServiceLevelRow
                  disabled={isDisabled}
                  errors={state.fieldErrors}
                  key={policy.priority}
                  policy={policy}
                />
              ),
            )}

            <div className="border-t border-line bg-[#fafbfc] px-4 py-3">
              <p className="text-[10px] leading-4 text-muted">
                Existing ticket due dates are not changed. Updated targets only apply to tickets created after saving.
              </p>
            </div>
          </section>

          {state.message ? (
            <p
              aria-live="polite"
              className={`rounded-[5px] border px-3 py-2.5 text-[10px] leading-4 ${
                state.status === "success"
                  ? "border-[#b9dfca] bg-[#f1faf5] text-[#276749]"
                  : "border-[#efc2c2] bg-[#fff6f6] text-danger"
              }`}
            >
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              className="inline-flex h-8 items-center justify-center rounded-[5px] bg-action px-4 text-[11px] font-medium text-white transition-colors hover:bg-[#15191f] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDisabled}
              type="submit"
            >
              {isPending
                ? "Saving settings..."
                : "Save settings"}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-[6px] border border-line bg-surface">
            <header className="flex items-start gap-2 border-b border-line px-4 py-3">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-3.5 text-muted"
                strokeWidth={1.8}
              />
              <div>
                <h2 className="text-[12px] font-semibold text-ink">
                  Workspace identity
                </h2>
                <p className="mt-0.5 text-[10px] text-muted">
                  Stable tenant information
                </p>
              </div>
            </header>

            <dl className="px-4 py-2">
              <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
                <dt className="text-[10px] text-muted">
                  Slug
                </dt>
                <dd className="max-w-[190px] break-all text-right font-mono text-[10px] text-ink">
                  {data.organization.slug}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-[10px] text-muted">
                  Timezone
                </dt>
                <dd className="max-w-[190px] text-right text-[10px] font-medium text-ink">
                  {data.organization.timezone}
                </dd>
              </div>
            </dl>

            <div className="border-t border-line bg-[#fafbfc] px-4 py-3">
              <p className="text-[10px] leading-4 text-muted">
                The workspace slug is immutable because it is used as a stable tenant identifier.
              </p>
            </div>
          </section>

          <ActivityHistory data={data} />
        </aside>
      </div>
    </main>
  );
}
