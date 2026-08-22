import { AppShell } from "@/components/layout/app-shell";
import {
  canAssignTickets,
  canCreateTicketForOtherMembers,
  canUpdateTicketStatus,
  canViewOrganizationTickets,
} from "@/features/auth/server/authorization";
import { requireWorkspaceSession } from "@/features/auth/server/workspace-session";
import { OperationsDashboard } from "@/features/operations/components/operations-dashboard";
import { getOperationsDashboardData } from "@/features/operations/server/get-operations-dashboard-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const workspace =
    await requireWorkspaceSession();

  const data =
    await getOperationsDashboardData();

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
      <OperationsDashboard
        assetOptions={data.assetOptions}
        assigneeOptions={
          data.assigneeOptions
        }
        capabilities={{
          canAssignTickets:
            canAssignTickets(role),
          canSelectOtherRequesters:
            canCreateTicketForOtherMembers(
              role,
            ),
          canUpdateTicketStatus:
            canUpdateTicketStatus(role),
          canViewOrganizationQueue:
            canViewOrganizationTickets(
              role,
            ),
        }}
        dateLabel={data.dateLabel}
        initialMetrics={data.metrics}
        initialTickets={data.tickets}
        organizationName={
          data.organizationName
        }
        requesterOptions={
          data.requesterOptions
        }
      />
    </AppShell>
  );
}
