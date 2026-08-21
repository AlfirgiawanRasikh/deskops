import { AppShell } from "@/components/layout/app-shell";
import { OperationsDashboard } from "@/features/operations/components/operations-dashboard";
import { getOperationsDashboardData } from "@/features/operations/server/get-operations-dashboard-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data =
    await getOperationsDashboardData();

  return (
    <AppShell>
      <OperationsDashboard
        dateLabel={data.dateLabel}
        initialMetrics={data.metrics}
        initialTickets={data.tickets}
        organizationName={
          data.organizationName
        }
      />
    </AppShell>
  );
}