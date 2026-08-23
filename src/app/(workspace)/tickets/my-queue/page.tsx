import { AppShell } from "@/components/layout/app-shell";
import { requireWorkspaceSession } from "@/features/auth/server/workspace-session";
import { TicketWorkspace } from "@/features/tickets/components/ticket-workspace";
import { parseTicketWorkspaceQuery } from "@/features/tickets/schemas/ticket-workspace-query";
import { getTicketWorkspaceData } from "@/features/tickets/server/get-ticket-workspace-data";
import type { TicketWorkspaceSearchParams } from "@/features/tickets/types/ticket-workspace";

export const dynamic = "force-dynamic";

type MyQueuePageProps = {
  searchParams: Promise<TicketWorkspaceSearchParams>;
};

export default async function MyQueuePage({
  searchParams,
}: MyQueuePageProps) {
  const workspace =
    await requireWorkspaceSession();

  const query =
    parseTicketWorkspaceQuery(
      await searchParams,
    );

  const data =
    await getTicketWorkspaceData({
      view: "mine",
      query,
    });

  return (
    <AppShell
      activeNavigation="queue"
      currentUser={{
        name: workspace.user.name,
        email: workspace.user.email,
        role: workspace.membership.role,
      }}
      organizationName={
        workspace.organization.name
      }
    >
      <TicketWorkspace data={data} />
    </AppShell>
  );
}
