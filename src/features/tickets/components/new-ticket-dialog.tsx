"use client";

import { X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import {
  newTicketSchema,
  type NewTicketInput,
} from "@/features/tickets/schemas/new-ticket";

type FieldErrors = Partial<Record<keyof NewTicketInput, string>>;

const inputClassName =
  "h-9 w-full rounded-[5px] border border-line bg-surface px-2.5 text-[13px] text-ink outline-none placeholder:text-[#98a2b3] focus:border-accent";

export function NewTicketDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (ticket: NewTicketInput) => void;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const result = newTicketSchema.safeParse({
      requestType: formData.get("requestType"),
      title: formData.get("title"),
      description: formData.get("description"),
      requester: formData.get("requester"),
      department: formData.get("department"),
      priority: formData.get("priority"),
      category: formData.get("category"),
      asset: formData.get("asset"),
    });

    if (!result.success) {
      const nextErrors: FieldErrors = {};

      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof NewTicketInput | undefined;

        if (field && !nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      }

      setErrors(nextErrors);
      return;
    }

    setErrors({});
    onCreate(result.data);
  }

  function fieldError(field: keyof NewTicketInput) {
    if (!errors[field]) return null;

    return (
      <p
        className="mt-1 text-[11px] leading-4 text-danger"
        id={`${field}-error`}
      >
        {errors[field]}
      </p>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#171a1f]/35 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="new-ticket-title"
        aria-modal="true"
        className="my-auto w-full max-w-[680px] overflow-hidden rounded-[6px] border border-line bg-surface shadow-[0_20px_60px_rgba(23,26,31,0.16)]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-6 border-b border-line px-5 py-4">
          <div>
            <h2
              className="text-[16px] font-semibold text-ink"
              id="new-ticket-title"
            >
              Create ticket
            </h2>
            <p className="mt-1 text-[12px] text-muted">
              Record the issue clearly so it can be routed without delay.
            </p>
          </div>

          <button
            aria-label="Close create ticket dialog"
            className="grid size-8 shrink-0 place-items-center rounded-[5px] text-muted hover:bg-canvas hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit}>
          <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[#4c5563]">
                Request type
              </span>
              <select
                className={inputClassName}
                defaultValue="Incident"
                name="requestType"
              >
                <option value="Incident">Incident</option>
                <option value="Service request">Service request</option>
              </select>
              {fieldError("requestType")}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[#4c5563]">
                Priority
              </span>
              <select
                className={inputClassName}
                defaultValue="Normal"
                name="priority"
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
              {fieldError("priority")}
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 flex items-center justify-between gap-3 text-[12px] font-medium text-[#4c5563]">
                <span>Title</span>
                <span className="font-normal text-muted">
                  5–120 characters
                </span>
              </span>
              <input
                aria-describedby={errors.title ? "title-error" : undefined}
                aria-invalid={Boolean(errors.title)}
                autoFocus
                className={inputClassName}
                name="title"
                placeholder="Short summary of the issue"
                type="text"
              />
              {fieldError("title")}
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 flex items-center justify-between gap-3 text-[12px] font-medium text-[#4c5563]">
                <span>Description</span>
                <span className="font-normal text-muted">
                  Minimum 15 characters
                </span>
              </span>
              <textarea
                aria-describedby={
                  errors.description ? "description-error" : undefined
                }
                aria-invalid={Boolean(errors.description)}
                className="min-h-28 w-full resize-y rounded-[5px] border border-line bg-surface px-2.5 py-2 text-[13px] leading-5 text-ink outline-none placeholder:text-[#98a2b3] focus:border-accent"
                name="description"
                placeholder="What happened, who is affected, and what has already been tried?"
              />
              {fieldError("description")}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[#4c5563]">
                Requester
              </span>
              <input
                aria-describedby={
                  errors.requester ? "requester-error" : undefined
                }
                aria-invalid={Boolean(errors.requester)}
                className={inputClassName}
                name="requester"
                placeholder="Employee name"
                type="text"
              />
              {fieldError("requester")}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[#4c5563]">
                Department
              </span>
              <select
                className={inputClassName}
                defaultValue=""
                name="department"
              >
                <option disabled value="">
                  Select department
                </option>
                <option value="Finance">Finance</option>
                <option value="People">People</option>
                <option value="Sales">Sales</option>
                <option value="Operations">Operations</option>
                <option value="Logistics">Logistics</option>
                <option value="Technology">Technology</option>
              </select>
              {fieldError("department")}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[#4c5563]">
                Category
              </span>
              <select
                className={inputClassName}
                defaultValue=""
                name="category"
              >
                <option disabled value="">
                  Select category
                </option>
                <option value="Network / VPN">Network / VPN</option>
                <option value="Access / Account">Access / Account</option>
                <option value="Hardware / Device">Hardware / Device</option>
                <option value="Software / License">Software / License</option>
                <option value="Security / Incident">Security / Incident</option>
              </select>
              {fieldError("category")}
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center justify-between gap-3 text-[12px] font-medium text-[#4c5563]">
                <span>Asset</span>
                <span className="font-normal text-muted">Optional</span>
              </span>
              <input
                aria-describedby={errors.asset ? "asset-error" : undefined}
                aria-invalid={Boolean(errors.asset)}
                className={inputClassName}
                name="asset"
                placeholder="Asset tag or device name"
                type="text"
              />
              {fieldError("asset")}
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line bg-[#fafbfc] px-5 py-3">
            <button
              className="h-8 rounded-[5px] px-3 text-[12px] font-medium text-[#4c5563] hover:bg-white hover:text-ink"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-8 rounded-[5px] bg-action px-3.5 text-[12px] font-medium text-white hover:bg-[#353b44]"
              type="submit"
            >
              Create ticket
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}