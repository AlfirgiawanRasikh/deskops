import { AppShell } from "@/components/layout/app-shell";
import { requireWorkspaceSession } from "@/features/auth/server/workspace-session";
import { OperationalReports } from "@/features/reports/components/operational-reports";
import { getOperationalReportData } from "@/features/reports/server/get-operational-report-data";

export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams: Promise<{
    range?: string | string[];
  }>;
};

export default async function ReportsPage({
  searchParams,
}: ReportsPageProps) {
  const workspace =
    await requireWorkspaceSession();

  const parameters = await searchParams;

  const data =
    await getOperationalReportData(
      parameters.range,
    );

  return (
    <AppShell
      activeNavigation="reports"
      currentUser={{
        name: workspace.user.name,
        email: workspace.user.email,
        role: workspace.membership.role,
      }}
      organizationName={
        workspace.organization.name
      }
    >
      <OperationalReports data={data} />
    </AppShell>
  );
}
