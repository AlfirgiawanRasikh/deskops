import { AppShell } from "@/components/layout/app-shell";
import { requireWorkspaceSession } from "@/features/auth/server/workspace-session";
import { KnowledgeArticleView } from "@/features/knowledge/components/knowledge-article-view";
import { getKnowledgeArticleData } from "@/features/knowledge/server/get-knowledge-base-data";

export const dynamic = "force-dynamic";

type KnowledgeArticlePageProps = {
  params: Promise<{
    articleId: string;
  }>;
};

export default async function KnowledgeArticlePage({
  params,
}: KnowledgeArticlePageProps) {
  const workspace =
    await requireWorkspaceSession();
  const { articleId } = await params;
  const data =
    await getKnowledgeArticleData(
      articleId,
    );

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
      <KnowledgeArticleView data={data} />
    </AppShell>
  );
}
