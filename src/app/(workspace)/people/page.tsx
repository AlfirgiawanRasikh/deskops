import { AppShell } from "@/components/layout/app-shell";
import { requireWorkspaceSession } from "@/features/auth/server/workspace-session";
import { PeopleDirectory } from "@/features/people/components/people-directory";
import { getPeopleDirectoryData } from "@/features/people/server/get-people-directory-data";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const workspace =
    await requireWorkspaceSession();

  const data =
    await getPeopleDirectoryData();

  return (
    <AppShell
      activeNavigation="people"
      currentUser={{
        name: workspace.user.name,
        email: workspace.user.email,
        role: workspace.membership.role,
      }}
      organizationName={
        workspace.organization.name
      }
    >
      <PeopleDirectory data={data} />
    </AppShell>
  );
}