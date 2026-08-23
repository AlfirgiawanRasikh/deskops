import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { canAddInternalTicketNotes } from "@/features/auth/server/authorization";
import { requireWorkspaceSession } from "@/features/auth/server/workspace-session";
import { TicketDetailView } from "@/features/tickets/components/ticket-detail-view";
import { getTicketDetailData } from "@/features/tickets/server/get-ticket-detail-data";
import { parseTicketReturnPath } from "@/features/tickets/utils/ticket-return-path";

export const dynamic = "force-dynamic";

type TicketDetailPageProps = {
  params: Promise<{
    ticketId: string;
  }>;
  searchParams: Promise<{
    returnTo?: string | string[];
  }>;
};

export default async function TicketDetailPage({
  params,
  searchParams,
}: TicketDetailPageProps) {
  const workspace =
    await requireWorkspaceSession();

  const { ticketId } = await params;

  const ticket =
    await getTicketDetailData(ticketId);

  if (!ticket) {
    notFound();
  }

  const role = workspace.membership.role;
  const parameters = await searchParams;

  const backHref = parseTicketReturnPath(
    parameters.returnTo,
    "/tickets/my-queue",
  );

  const isMyQueue = backHref.startsWith(
    "/tickets/my-queue",
  );

  const isAllTickets =
    !isMyQueue;

  const activeNavigation =
    isAllTickets
      ? "tickets"
      : "queue";

  const backLabel = isMyQueue
    ? role === "EMPLOYEE"
      ? "Back to my requests"
      : "Back to my queue"
    : "Back to all tickets";

  return (
    <AppShell
      activeNavigation={activeNavigation}
      currentUser={{
        name: workspace.user.name,
        email: workspace.user.email,
        role,
      }}
      organizationName={
        workspace.organization.name
      }
    >
      <TicketDetailView
        backHref={backHref}
        backLabel={backLabel}
        canAddInternalNotes={
          canAddInternalTicketNotes(role)
        }
        ticket={ticket}
      />
    </AppShell>
  );
}
