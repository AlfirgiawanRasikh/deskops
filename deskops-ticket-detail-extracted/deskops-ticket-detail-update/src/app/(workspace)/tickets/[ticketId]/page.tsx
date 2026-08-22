import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { canAddInternalTicketNotes } from "@/features/auth/server/authorization";
import { requireWorkspaceSession } from "@/features/auth/server/workspace-session";
import { TicketDetailView } from "@/features/tickets/components/ticket-detail-view";
import { getTicketDetailData } from "@/features/tickets/server/get-ticket-detail-data";

export const dynamic = "force-dynamic";

type TicketDetailPageProps = {
  params: Promise<{
    ticketId: string;
  }>;
};

export default async function TicketDetailPage({
  params,
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

  return (
    <AppShell
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
        canAddInternalNotes={
          canAddInternalTicketNotes(role)
        }
        ticket={ticket}
      />
    </AppShell>
  );
}
