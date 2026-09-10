import { AppShell } from "@/components/layout/app-shell";
import { AuditLog } from "@/features/audit/components/audit-log";
import { parseAuditLogQuery } from "@/features/audit/schemas/audit-log-query";
import { getAuditLogData } from "@/features/audit/server/get-audit-log-data";
import type { AuditLogSearchParams } from "@/features/audit/types/audit-log";
import { requireWorkspaceSession } from "@/features/auth/server/workspace-session";

export const dynamic = "force-dynamic";

type AuditPageProps = {
  searchParams: Promise<AuditLogSearchParams>;
};

export default async function AuditPage({
  searchParams,
}: AuditPageProps) {
  const workspace =
    await requireWorkspaceSession();
  const query = parseAuditLogQuery(
    await searchParams,
  );
  const data = await getAuditLogData(
    query,
  );

  return (
    <AppShell
      activeNavigation="audit"
      currentUser={{
        name: workspace.user.name,
        email: workspace.user.email,
        role: workspace.membership.role,
      }}
      organizationName={
        workspace.organization.name
      }
    >
      <AuditLog data={data} />
    </AppShell>
  );
}
