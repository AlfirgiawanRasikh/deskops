import { AppShell } from "@/components/layout/app-shell";
import { OperationsDashboard } from "@/features/operations/components/operations-dashboard";

export default function Home() {
  return (
    <AppShell>
      <OperationsDashboard />
    </AppShell>
  );
}
