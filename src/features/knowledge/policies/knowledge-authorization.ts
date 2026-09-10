import type { WorkspaceRole } from "@/features/auth/policies/workspace-authorization";

type KnowledgeArticleAccess = {
  authorId: string;
  status: string;
};

const knowledgeAuthorRoles =
  new Set<WorkspaceRole>([
    "OWNER",
    "ADMIN",
    "MANAGER",
    "TECHNICIAN",
  ]);

const knowledgeManagerRoles =
  new Set<WorkspaceRole>([
    "OWNER",
    "ADMIN",
    "MANAGER",
  ]);

export function canViewKnowledgeBase(
  role: WorkspaceRole,
) {
  return [
    "OWNER",
    "ADMIN",
    "MANAGER",
    "TECHNICIAN",
    "EMPLOYEE",
  ].includes(role);
}

export function canCreateKnowledgeArticle(
  role: WorkspaceRole,
) {
  return knowledgeAuthorRoles.has(role);
}

export function canManageKnowledgeArticles(
  role: WorkspaceRole,
) {
  return knowledgeManagerRoles.has(role);
}

export function canViewKnowledgeArticle({
  role,
  userId,
  article,
}: {
  role: WorkspaceRole;
  userId: string;
  article: KnowledgeArticleAccess;
}) {
  if (article.status === "PUBLISHED") {
    return true;
  }

  if (canManageKnowledgeArticles(role)) {
    return true;
  }

  return (
    role === "TECHNICIAN" &&
    article.status === "DRAFT" &&
    article.authorId === userId
  );
}

export function canEditKnowledgeArticle({
  role,
  userId,
  article,
}: {
  role: WorkspaceRole;
  userId: string;
  article: KnowledgeArticleAccess;
}) {
  if (canManageKnowledgeArticles(role)) {
    return true;
  }

  return (
    role === "TECHNICIAN" &&
    article.status === "DRAFT" &&
    article.authorId === userId
  );
}

export function getKnowledgeArticleReadScope({
  organizationId,
  userId,
  role,
}: {
  organizationId: string;
  userId: string;
  role: WorkspaceRole;
}) {
  if (canManageKnowledgeArticles(role)) {
    return {
      organizationId,
    };
  }

  if (role === "TECHNICIAN") {
    return {
      organizationId,
      OR: [
        {
          status: "PUBLISHED" as const,
        },
        {
          status: "DRAFT" as const,
          authorId: userId,
        },
      ],
    };
  }

  return {
    organizationId,
    status: "PUBLISHED" as const,
  };
}
