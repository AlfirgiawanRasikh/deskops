export const knowledgeArticleStatuses = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export const knowledgeStatusFilters = [
  "ALL",
  ...knowledgeArticleStatuses,
] as const;

export type KnowledgeArticleStatus =
  (typeof knowledgeArticleStatuses)[number];

export type KnowledgeStatusFilter =
  (typeof knowledgeStatusFilters)[number];

export type KnowledgeBaseSearchParams = {
  q?: string | string[];
  category?: string | string[];
  status?: string | string[];
  page?: string | string[];
};

export type KnowledgeBaseQuery = {
  query: string;
  category: string;
  status: KnowledgeStatusFilter;
  page: number;
};

export type KnowledgeArticleListItem = {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  status: KnowledgeArticleStatus;
  authorName: string;
  updatedAt: string;
  publishedAt: string | null;
  readTimeMinutes: number;
};

export type KnowledgeArticleSuggestion = {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
};

export type KnowledgeBaseMetric = {
  label: string;
  value: number;
  description: string;
};

export type KnowledgeBaseData = {
  organizationName: string;
  query: KnowledgeBaseQuery;
  articles: KnowledgeArticleListItem[];
  categories: string[];
  metrics: KnowledgeBaseMetric[];
  capabilities: {
    canCreate: boolean;
    canManageAll: boolean;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    firstItem: number;
    lastItem: number;
  };
};

export type KnowledgeArticleDetailData = {
  article: KnowledgeArticleListItem & {
    content: string;
    authorEmail: string;
    createdAt: string;
  };
  capabilities: {
    canEdit: boolean;
    canManageStatus: boolean;
  };
  events: Array<{
    id: string;
    action: string;
    summary: string;
    actorName: string;
    occurredAt: string;
  }>;
};

export type KnowledgeActionResult = {
  success: boolean;
  message: string;
  articleId?: string;
};
