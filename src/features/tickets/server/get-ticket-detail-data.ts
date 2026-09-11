import "server-only";

import {
  canAssignTickets,
  canViewInternalTicketComments,
  getAuthorizedWorkspace,
  getTicketReadScope,
} from "@/features/auth/server/authorization";
import {
  approvalApproverRoles,
  canDecideTicketApproval,
  canRequestTicketApproval,
} from "@/features/approvals/policies/request-approval-authorization";
import type { TicketDetailData } from "@/features/tickets/types/ticket-detail";
import {
  canConfirmTicketResolution,
  canResolveTicket,
} from "@/features/resolutions/policies/ticket-resolution-authorization";
import {
  canReopenTicketResolution,
  getTicketReopenDeadline,
} from "@/features/resolutions/utils/ticket-resolution-workflow";
import {
  getTicketSlaSnapshot,
  getTicketSlaTone,
} from "@/features/tickets/utils/ticket-sla";
import { prisma } from "@/lib/prisma";

function formatEnumValue(value: string) {
  const normalized = value
    .toLowerCase()
    .replaceAll("_", " ");

  return `${normalized
    .charAt(0)
    .toUpperCase()}${normalized.slice(1)}`;
}

function formatDateTime(
  date: Date,
  timeZone: string,
) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

function formatEvent(event: {
  action: string;
  fromValue: string | null;
  toValue: string | null;
  actor: {
    name: string;
  } | null;
}) {
  const actor =
    event.actor?.name ?? "System";

  switch (event.action) {
    case "TICKET_CREATED":
      return `${actor} created this ticket.`;

    case "STATUS_CHANGED":
      return `${actor} changed the status from ${
        event.fromValue
          ? formatEnumValue(
              event.fromValue,
            )
          : "empty"
      } to ${
        event.toValue
          ? formatEnumValue(event.toValue)
          : "empty"
      }.`;

    case "ASSIGNEE_CHANGED":
      return event.toValue
        ? `${actor} assigned the ticket to ${event.toValue}.`
        : `${actor} returned the ticket to the unassigned queue.`;

    case "APPROVAL_REQUESTED":
      return `${actor} requested approval from ${
        event.toValue ?? "an approver"
      }.`;

    case "APPROVAL_DECIDED":
      return `${actor} ${
        event.toValue === "APPROVED"
          ? "approved"
          : "rejected"
      } the service request.`;

    case "RESOLUTION_RECORDED":
      return `${actor} resolved the ticket and requested confirmation.`;

    case "RESOLUTION_CONFIRMED":
      return `${actor} confirmed the resolution and closed the ticket.`;

    case "TICKET_REOPENED":
      return `${actor} reopened the ticket for further work.`;

    default:
      return `${actor} updated this ticket.`;
  }
}

export async function getTicketDetailData(
  ticketId: string,
): Promise<TicketDetailData | null> {
  const workspace =
    await getAuthorizedWorkspace();

  const role = workspace.membership.role;
  const organizationId =
    workspace.organization.id;

  const canReadInternalComments =
    canViewInternalTicketComments(role);

  const ticket =
    await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        ...getTicketReadScope({
          organizationId,
          userId: workspace.user.id,
          role,
        }),
      },
      select: {
        id: true,
        number: true,
        type: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        firstResponseDueAt: true,
        firstRespondedAt: true,
        resolutionDueAt: true,
        resolvedAt: true,
        closedAt: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            memberships: {
              where: {
                organizationId,
              },
              select: {
                department: true,
              },
              take: 1,
            },
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        asset: {
          select: {
            assetTag: true,
            name: true,
            model: true,
            serialNumber: true,
          },
        },
        comments: {
          ...(canReadInternalComments
            ? {}
            : {
                where: {
                  visibility: "PUBLIC",
                } as const,
              }),
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            body: true,
            visibility: true,
            createdAt: true,
            author: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        events: {
          where: {
            action: {
              not: "COMMENT_ADDED",
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
          select: {
            id: true,
            action: true,
            fromValue: true,
            toValue: true,
            createdAt: true,
            actor: {
              select: {
                name: true,
              },
            },
          },
        },
        approvals: {
          orderBy: {
            requestedAt: "desc",
          },
          take: 10,
          select: {
            id: true,
            status: true,
            requestNote: true,
            decisionNote: true,
            requestedAt: true,
            decidedAt: true,
            requestedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        resolutions: {
          orderBy: {
            resolvedAt: "desc",
          },
          take: 10,
          select: {
            id: true,
            status: true,
            category: true,
            summary: true,
            resolvedAt: true,
            confirmedAt: true,
            reopenedAt: true,
            reopenReason: true,
            resolvedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

  if (!ticket) {
    return null;
  }

  const timeZone =
    workspace.organization.timezone;

  const assignableMemberships =
    canAssignTickets(role)
      ? await prisma.membership.findMany({
          where: {
            organizationId,
            status: "ACTIVE",
            role: "TECHNICIAN",
          },
          orderBy: {
            user: {
              name: "asc",
            },
          },
          select: {
            department: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })
      : [];

  const hasPendingApproval =
    ticket.approvals.some(
      (approval) =>
        approval.status === "PENDING",
    );

  const approvalEligible =
    ticket.type === "SERVICE_REQUEST";

  const pendingResolution =
    ticket.resolutions.find(
      (resolution) =>
        resolution.status ===
        "PENDING_CONFIRMATION",
    );

  const canResolve =
    !pendingResolution &&
    !hasPendingApproval &&
    ![
      "WAITING_APPROVAL",
      "RESOLVED",
      "CLOSED",
      "CANCELED",
    ].includes(ticket.status) &&
    canResolveTicket({
      role,
      actorId: workspace.user.id,
      assigneeId:
        ticket.assignee?.id ?? null,
    });

  const canRequestApproval =
    approvalEligible &&
    !hasPendingApproval &&
    ticket.status !== "WAITING_APPROVAL" &&
    ![
      "RESOLVED",
      "CLOSED",
      "CANCELED",
    ].includes(ticket.status) &&
    canRequestTicketApproval({
      role,
      actorId: workspace.user.id,
      assigneeId:
        ticket.assignee?.id ?? null,
    });

  const approvalMemberships =
    canRequestApproval
      ? await prisma.membership.findMany({
          where: {
            organizationId,
            status: "ACTIVE",
            role: {
              in: [
                ...approvalApproverRoles,
              ],
            },
            userId: {
              notIn: [
                workspace.user.id,
                ticket.requester.id,
              ],
            },
          },
          orderBy: {
            user: {
              name: "asc",
            },
          },
          select: {
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })
      : [];

  const prefix =
    ticket.type === "INCIDENT"
      ? "INC"
      : "REQ";

  const sla = getTicketSlaSnapshot({
    status: ticket.status,
    createdAt: ticket.createdAt,
    firstResponseDueAt:
      ticket.firstResponseDueAt,
    firstRespondedAt:
      ticket.firstRespondedAt,
    resolutionDueAt:
      ticket.resolutionDueAt,
    resolvedAt: ticket.resolvedAt,
    closedAt: ticket.closedAt,
    now: new Date(),
  });

  const resolutionCompletedAt =
    ticket.resolvedAt ??
    ticket.closedAt;

  const firstResponseSla = {
    label: sla.firstResponse.label,
    status:
      sla.firstResponse.statusLabel,
    timing:
      sla.firstResponse.timingLabel,
    dueAt: ticket.firstResponseDueAt
      ? formatDateTime(
          ticket.firstResponseDueAt,
          timeZone,
        )
      : null,
    completedAt:
      ticket.firstRespondedAt
        ? formatDateTime(
            ticket.firstRespondedAt,
            timeZone,
          )
        : null,
    progress:
      sla.firstResponse.progress,
    tone: getTicketSlaTone(
      sla.firstResponse.state,
    ),
  };

  const resolutionSla = {
    label: sla.resolution.label,
    status:
      sla.resolution.statusLabel,
    timing:
      sla.resolution.timingLabel,
    dueAt: ticket.resolutionDueAt
      ? formatDateTime(
          ticket.resolutionDueAt,
          timeZone,
        )
      : null,
    completedAt:
      resolutionCompletedAt
        ? formatDateTime(
            resolutionCompletedAt,
            timeZone,
          )
        : null,
    progress:
      sla.resolution.progress,
    tone: getTicketSlaTone(
      sla.resolution.state,
    ),
  };

  return {
    databaseId: ticket.id,
    displayId: `${prefix}-${ticket.number}`,
    requestType:
      formatEnumValue(ticket.type),
    requestTypeCode: ticket.type,
    title: ticket.title,
    description: ticket.description,
    status: formatEnumValue(ticket.status),
    priority:
      formatEnumValue(ticket.priority),
    category: ticket.category,
    createdAt: formatDateTime(
      ticket.createdAt,
      timeZone,
    ),
    updatedAt: formatDateTime(
      ticket.updatedAt,
      timeZone,
    ),
    requester: {
      id: ticket.requester.id,
      name: ticket.requester.name,
      email: ticket.requester.email,
      department:
        ticket.requester
          .memberships[0]
          ?.department ??
        "No department",
    },
    assignee: ticket.assignee
      ? {
          id: ticket.assignee.id,
          name: ticket.assignee.name,
          email: ticket.assignee.email,
        }
      : null,
    assigneeOptions:
      assignableMemberships.map(
        (membership) => ({
          value: membership.user.id,
          label: `${membership.user.name} - ${
            membership.department ??
            membership.user.email
          }`,
        }),
      ),
    approval: {
      eligible: approvalEligible,
      canRequest: canRequestApproval,
      approverOptions:
        approvalMemberships.map(
          (membership) => ({
            value: membership.user.id,
            label: `${membership.user.name} - ${formatEnumValue(
              membership.role,
            )}`,
          }),
        ),
      history: ticket.approvals.map(
        (approval) => ({
          id: approval.id,
          status: approval.status,
          requestNote:
            approval.requestNote,
          decisionNote:
            approval.decisionNote,
          requestedAt: formatDateTime(
            approval.requestedAt,
            timeZone,
          ),
          decidedAt: approval.decidedAt
            ? formatDateTime(
                approval.decidedAt,
                timeZone,
              )
            : null,
          requestedBy:
            approval.requestedBy,
          approver: approval.approver,
          canDecide:
            canDecideTicketApproval({
              role,
              actorId:
                workspace.user.id,
              approverId:
                approval.approver.id,
              status: approval.status,
            }),
        }),
      ),
    },
    resolution: {
      canResolve,
      history: ticket.resolutions.map(
        (resolution) => {
          const now = new Date();

          return {
            id: resolution.id,
            status: resolution.status,
            category: resolution.category,
            categoryLabel:
              formatEnumValue(
                resolution.category,
              ),
            summary: resolution.summary,
            resolvedAt: formatDateTime(
              resolution.resolvedAt,
              timeZone,
            ),
            resolvedBy:
              resolution.resolvedBy,
            confirmedAt:
              resolution.confirmedAt
                ? formatDateTime(
                    resolution.confirmedAt,
                    timeZone,
                  )
                : null,
            reopenedAt:
              resolution.reopenedAt
                ? formatDateTime(
                    resolution.reopenedAt,
                    timeZone,
                  )
                : null,
            reopenReason:
              resolution.reopenReason,
            reopenDeadline:
              formatDateTime(
                getTicketReopenDeadline(
                  resolution.resolvedAt,
                ),
                timeZone,
              ),
            canConfirm:
              canConfirmTicketResolution({
                actorId:
                  workspace.user.id,
                requesterId:
                  ticket.requester.id,
                ticketStatus:
                  ticket.status,
                resolutionStatus:
                  resolution.status,
              }),
            canReopen:
              canReopenTicketResolution({
                actorId:
                  workspace.user.id,
                requesterId:
                  ticket.requester.id,
                ticketStatus:
                  ticket.status,
                resolutionStatus:
                  resolution.status,
                resolvedAt:
                  resolution.resolvedAt,
                now,
              }),
          };
        },
      ),
    },
    sla: {
      status: sla.statusLabel,
      phase: sla.phaseLabel,
      timing: sla.timingLabel,
      progress: sla.progress,
      tone: sla.tone,
      firstResponse:
        firstResponseSla,
      resolution: resolutionSla,
    },
    asset: ticket.asset
      ? {
          label: `${ticket.asset.assetTag} - ${
            ticket.asset.name
          }${
            ticket.asset.model
              ? ` - ${ticket.asset.model}`
              : ""
          }`,
          serialNumber:
            ticket.asset.serialNumber,
        }
      : null,
    comments: ticket.comments.map(
      (comment) => ({
        id: comment.id,
        authorName: comment.author.name,
        authorEmail:
          comment.author.email,
        body: comment.body,
        visibility: comment.visibility,
        createdAt: formatDateTime(
          comment.createdAt,
          timeZone,
        ),
      }),
    ),
    activity: ticket.events.map(
      (event) => ({
        id: event.id,
        description: formatEvent(event),
        createdAt: formatDateTime(
          event.createdAt,
          timeZone,
        ),
      }),
    ),
  };
}
