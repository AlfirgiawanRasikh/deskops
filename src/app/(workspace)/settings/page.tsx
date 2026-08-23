import { AppShell } from "@/components/layout/app-shell";
import { requireWorkspaceSession } from "@/features/auth/server/workspace-session";
import { WorkspaceSettings } from "@/features/settings/components/workspace-settings";
import { getWorkspaceSettingsData } from "@/features/settings/server/get-workspace-settings-data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const workspace =
    await requireWorkspaceSession();

  const data =
    await getWorkspaceSettingsData();

  return (
    <AppShell
      activeNavigation="settings"
      currentUser={{
        name: workspace.user.name,
        email: workspace.user.email,
        role: workspace.membership.role,
      }}
      organizationName={
        workspace.organization.name
      }
    >
      <WorkspaceSettings data={data} />
    </AppShell>
  );
}
