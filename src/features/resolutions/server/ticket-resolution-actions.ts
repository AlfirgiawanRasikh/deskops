"use server";

import { revalidatePath } from "next/cache";

import {
  AuthorizationError,
  getAuthorizedWorkspace,
} from "@/features/auth/server/authorization";
import {
  canConfirmTicketResolution,
  canResolveTicket,
} from "@/features/resolutions/policies/ticket-resolution-authorization";
import {
  confirmTicketResolutionActionSchema,
  type ConfirmTicketResolutionActionInput,
  reopenTicketActionSchema,
  type ReopenTicketActionInput,
  resolveTicketActionSchema,
  type ResolveTicketActionInput,
} from "@/features/resolutions/schemas/ticket-resolution-actions";
import { createResolutionNotifications } from "@/features/resolutions/server/resolution-notifications";
import { canReopenTicketResolution } from "@/features/resolutions/utils/ticket-resolution-workflow";
import type { TicketActionResult } from "@/features/tickets/types/ticket-actions";
import { prisma } from "@/lib/prisma";

class ResolutionMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResolutionMutationError";
  }
}

function firstValidationMessage(issues: Array<{ message: string }>) {
  return issues[0]?.message ?? "The submitted resolution data is invalid.";
}

function isPrismaErrorWithCode(error: unknown, codes: string[]) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      codes.includes(String(error.code)),
  );
}

function failure(error: unknown): TicketActionResult {
  if (
    error instanceof ResolutionMutationError ||
    error instanceof AuthorizationError
  ) {
    return { success: false, message: error.message };
  }

  if (isPrismaErrorWithCode(error, ["P2002", "P2034"])) {
    return {
      success: false,
      message:
        "The resolution state changed while this action was being saved. Refresh the page and try again.",
    };
  }

  console.error("DeskOps resolution mutation failed:", error);
  return {
    success: false,
    message:
      "DeskOps could not complete this resolution action. Please try again.",
  };
}

function revalidateTicket(ticketId: string) {
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidatePath("/tickets/my-queue");
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/reports");
  revalidatePath("/audit");
}

export async function resolveTicketAction(
  rawInput: ResolveTicketActionInput,
): Promise<TicketActionResult> {
  const validation = resolveTicketActionSchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      message: firstValidationMessage(validation.error.issues),
    };
  }

  try {
    const workspace = await getAuthorizedWorkspace();
    const input = validation.data;

    const ticketId = await prisma.$transaction(
      async (transaction) => {
        const ticket = await transaction.ticket.findFirst({
          where: {
            id: input.ticketId,
            organizationId: workspace.organization.id,
          },
          select: {
            id: true,
            number: true,
            type: true,
            title: true,
            requesterId: true,
            assigneeId: true,
            status: true,
            approvals: {
              where: { status: "PENDING" },
              select: { id: true },
              take: 1,
            },
            resolutions: {
              where: { status: "PENDING_CONFIRMATION" },
              select: { id: true },
              take: 1,
            },
          },
        });

        if (!ticket) {
          throw new ResolutionMutationError(
            "The selected ticket could not be found.",
          );
        }

        if (
          !canResolveTicket({
            role: workspace.membership.role,
            actorId: workspace.user.id,
            assigneeId: ticket.assigneeId,
          })
        ) {
          throw new AuthorizationError(
            workspace.membership.role === "TECHNICIAN"
              ? "Technicians can resolve only tickets assigned to them."
              : "Your current role cannot resolve this ticket.",
          );
        }

        if (ticket.approvals.length > 0 || ticket.status === "WAITING_APPROVAL") {
          throw new ResolutionMutationError(
            "Resolve the pending approval before resolving this ticket.",
          );
        }

        if (ticket.resolutions.length > 0 || ticket.status === "RESOLVED") {
          throw new ResolutionMutationError(
            "This ticket already has a resolution waiting for confirmation.",
          );
        }

        if (["CLOSED", "CANCELED"].includes(ticket.status)) {
          throw new ResolutionMutationError(
            "A closed or canceled ticket cannot be resolved again.",
          );
        }

        const resolvedAt = new Date();
        const resolution = await transaction.ticketResolution.create({
          data: {
            ticketId: ticket.id,
            resolvedById: workspace.user.id,
            category: input.category,
            summary: input.summary,
            resolvedAt,
          },
          select: { id: true },
        });

        await transaction.ticket.update({
          where: { id: ticket.id },
          data: {
            status: "RESOLVED",
            resolvedAt,
            closedAt: null,
          },
        });

        await transaction.ticketEvent.create({
          data: {
            ticketId: ticket.id,
            actorId: workspace.user.id,
            action: "RESOLUTION_RECORDED",
            fromValue: ticket.status,
            toValue: "RESOLVED",
            metadata: {
              source: "ticket-detail",
              resolutionId: resolution.id,
              category: input.category,
            },
          },
        });

        await createResolutionNotifications(transaction, {
          organizationId: workspace.organization.id,
          actorId: workspace.user.id,
          actorName: workspace.user.name,
          resolvedById: workspace.user.id,
          event: "RESOLVED",
          ticket,
        });

        return ticket.id;
      },
      { isolationLevel: "Serializable" },
    );

    revalidateTicket(ticketId);
    return {
      success: true,
      message: "Resolution saved. The ticket is waiting for requester confirmation.",
      ticketId,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function confirmTicketResolutionAction(
  rawInput: ConfirmTicketResolutionActionInput,
): Promise<TicketActionResult> {
  const validation = confirmTicketResolutionActionSchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      message: firstValidationMessage(validation.error.issues),
    };
  }

  try {
    const workspace = await getAuthorizedWorkspace();
    const resolutionId = validation.data.resolutionId;

    const ticketId = await prisma.$transaction(
      async (transaction) => {
        const resolution = await transaction.ticketResolution.findFirst({
          where: {
            id: resolutionId,
            ticket: { organizationId: workspace.organization.id },
          },
          select: {
            id: true,
            status: true,
            resolvedById: true,
            ticket: {
              select: {
                id: true,
                number: true,
                type: true,
                title: true,
                requesterId: true,
                assigneeId: true,
                status: true,
              },
            },
          },
        });

        if (!resolution) {
          throw new ResolutionMutationError(
            "The selected resolution could not be found.",
          );
        }

        if (
          !canConfirmTicketResolution({
            actorId: workspace.user.id,
            requesterId: resolution.ticket.requesterId,
            ticketStatus: resolution.ticket.status,
            resolutionStatus: resolution.status,
          })
        ) {
          throw new AuthorizationError(
            resolution.status !== "PENDING_CONFIRMATION"
              ? "This resolution has already been decided."
              : "Only the ticket requester can confirm this resolution.",
          );
        }

        const confirmedAt = new Date();
        const updated = await transaction.ticketResolution.updateMany({
          where: { id: resolution.id, status: "PENDING_CONFIRMATION" },
          data: { status: "CONFIRMED", confirmedAt },
        });
        if (updated.count !== 1) {
          throw new ResolutionMutationError(
            "This resolution has already been decided.",
          );
        }

        const updatedTicket = await transaction.ticket.updateMany({
          where: { id: resolution.ticket.id, status: "RESOLVED" },
          data: { status: "CLOSED", closedAt: confirmedAt },
        });
        if (updatedTicket.count !== 1) {
          throw new ResolutionMutationError(
            "The ticket is no longer waiting for resolution confirmation.",
          );
        }

        await transaction.ticketEvent.create({
          data: {
            ticketId: resolution.ticket.id,
            actorId: workspace.user.id,
            action: "RESOLUTION_CONFIRMED",
            fromValue: "RESOLVED",
            toValue: "CLOSED",
            metadata: {
              source: "ticket-detail",
              resolutionId: resolution.id,
            },
          },
        });

        await createResolutionNotifications(transaction, {
          organizationId: workspace.organization.id,
          actorId: workspace.user.id,
          actorName: workspace.user.name,
          resolvedById: resolution.resolvedById,
          event: "CONFIRMED",
          ticket: resolution.ticket,
        });

        return resolution.ticket.id;
      },
      { isolationLevel: "Serializable" },
    );

    revalidateTicket(ticketId);
    return {
      success: true,
      message: "Resolution confirmed. The ticket is now closed.",
      ticketId,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function reopenTicketAction(
  rawInput: ReopenTicketActionInput,
): Promise<TicketActionResult> {
  const validation = reopenTicketActionSchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      message: firstValidationMessage(validation.error.issues),
    };
  }

  try {
    const workspace = await getAuthorizedWorkspace();
    const input = validation.data;

    const ticketId = await prisma.$transaction(
      async (transaction) => {
        const resolution = await transaction.ticketResolution.findFirst({
          where: {
            id: input.resolutionId,
            ticket: { organizationId: workspace.organization.id },
          },
          select: {
            id: true,
            status: true,
            resolvedAt: true,
            resolvedById: true,
            ticket: {
              select: {
                id: true,
                number: true,
                type: true,
                title: true,
                requesterId: true,
                assigneeId: true,
                status: true,
              },
            },
          },
        });

        if (!resolution) {
          throw new ResolutionMutationError(
            "The selected resolution could not be found.",
          );
        }

        const reopenedAt = new Date();
        if (
          !canReopenTicketResolution({
            actorId: workspace.user.id,
            requesterId: resolution.ticket.requesterId,
            ticketStatus: resolution.ticket.status,
            resolutionStatus: resolution.status,
            resolvedAt: resolution.resolvedAt,
            now: reopenedAt,
          })
        ) {
          throw new AuthorizationError(
            resolution.status !== "PENDING_CONFIRMATION"
              ? "This resolution has already been decided."
              : workspace.user.id !== resolution.ticket.requesterId
                ? "Only the ticket requester can reopen this ticket."
                : "The 7-day reopen window has expired.",
          );
        }

        const updated = await transaction.ticketResolution.updateMany({
          where: { id: resolution.id, status: "PENDING_CONFIRMATION" },
          data: {
            status: "REOPENED",
            reopenedAt,
            reopenReason: input.reason,
          },
        });
        if (updated.count !== 1) {
          throw new ResolutionMutationError(
            "This resolution has already been decided.",
          );
        }

        const updatedTicket = await transaction.ticket.updateMany({
          where: { id: resolution.ticket.id, status: "RESOLVED" },
          data: {
            status: "IN_PROGRESS",
            resolvedAt: null,
            closedAt: null,
          },
        });
        if (updatedTicket.count !== 1) {
          throw new ResolutionMutationError(
            "The ticket is no longer waiting for resolution confirmation.",
          );
        }

        await transaction.ticketEvent.create({
          data: {
            ticketId: resolution.ticket.id,
            actorId: workspace.user.id,
            action: "TICKET_REOPENED",
            fromValue: "RESOLVED",
            toValue: "IN_PROGRESS",
            metadata: {
              source: "ticket-detail",
              resolutionId: resolution.id,
            },
          },
        });

        await createResolutionNotifications(transaction, {
          organizationId: workspace.organization.id,
          actorId: workspace.user.id,
          actorName: workspace.user.name,
          resolvedById: resolution.resolvedById,
          event: "REOPENED",
          ticket: resolution.ticket,
        });

        return resolution.ticket.id;
      },
      { isolationLevel: "Serializable" },
    );

    revalidateTicket(ticketId);
    return {
      success: true,
      message: "Ticket reopened and returned to In progress.",
      ticketId,
    };
  } catch (error) {
    return failure(error);
  }
}
