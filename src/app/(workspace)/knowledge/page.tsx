import { AppShell } from "@/components/layout/app-shell";
import { requireWorkspaceSession } from "@/features/auth/server/workspace-session";
import { KnowledgeBase } from "@/features/knowledge/components/knowledge-base";
import { parseKnowledgeBaseQuery } from "@/features/knowledge/schemas/knowledge-base-query";
import { getKnowledgeBaseData } from "@/features/knowledge/server/get-knowledge-base-data";
import type { KnowledgeBaseSearchParams } from "@/features/knowledge/types/knowledge-base";

export const dynamic = "force-dynamic";

type KnowledgePageProps = {
  searchParams: Promise<KnowledgeBaseSearchParams>;
};

export default async function KnowledgePage({
  searchParams,
}: KnowledgePageProps) {
  const workspace =
    await requireWorkspaceSession();
  const query = parseKnowledgeBaseQuery(
    await searchParams,
  );
  const data =
    await getKnowledgeBaseData(query);

  return (
    <AppShell
      activeNavigation="knowledge"
      currentUser={{
        name: workspace.user.name,
        email: workspace.user.email,
        role: workspace.membership.role,
      }}
      organizationName={
        workspace.organization.name
      }
    >
      <KnowledgeBase data={data} />
    </AppShell>
  );
}
