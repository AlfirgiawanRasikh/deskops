import { AppShell } from "@/components/layout/app-shell";
import { AssetInventory } from "@/features/assets/components/asset-inventory";
import { getAssetInventoryData } from "@/features/assets/server/get-asset-inventory-data";
import { requireWorkspaceSession } from "@/features/auth/server/workspace-session";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const workspace =
    await requireWorkspaceSession();

  const data =
    await getAssetInventoryData();

  return (
    <AppShell
      activeNavigation="assets"
      currentUser={{
        name: workspace.user.name,
        email: workspace.user.email,
        role: workspace.membership.role,
      }}
      organizationName={
        workspace.organization.name
      }
    >
      <AssetInventory data={data} />
    </AppShell>
  );
}