import "server-only";

import { notFound } from "next/navigation";

import type { Prisma } from "@/generated/prisma/client";
import { getAuthorizedWorkspace } from "@/features/auth/server/authorization";
import {
  canCreateKnowledgeArticle,
  canEditKnowledgeArticle,
  canManageKnowledgeArticles,
  canViewKnowledgeBase,
  getKnowledgeArticleReadScope,
} from "@/features/knowledge/policies/knowledge-authorization";
import type {
  KnowledgeArticleDetailData,
  KnowledgeArticleListItem,
  KnowledgeBaseData,
  KnowledgeBaseQuery,
} from "@/features/knowledge/types/knowledge-base";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 12;

function formatDate(
  date: Date,
  timeZone: string,
) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(date);
}

function readTime(content: string) {
  const words = content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 200));
}

function mapArticle(
  article: {
    id: string;
    title: string;
    summary: string;
    content: string;
    category: string;
    tags: string[];
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    updatedAt: Date;
    publishedAt: Date | null;
    author: {
      name: string;
    };
  },
  timeZone: string,
): KnowledgeArticleListItem {
  return {
    id: article.id,
    title: article.title,
    summary: article.summary,
    category: article.category,
    tags: article.tags,
    status: article.status,
    authorName: article.author.name,
    updatedAt: formatDate(
      article.updatedAt,
      timeZone,
    ),
    publishedAt: article.publishedAt
      ? formatDate(
          article.publishedAt,
          timeZone,
        )
      : null,
    readTimeMinutes: readTime(
      article.content,
    ),
  };
}

export async function getKnowledgeBaseData(
  query: KnowledgeBaseQuery,
): Promise<KnowledgeBaseData> {
  const workspace =
    await getAuthorizedWorkspace();
  const role = workspace.membership.role;

  if (!canViewKnowledgeBase(role)) {
    notFound();
  }

  const readScope =
    getKnowledgeArticleReadScope({
      organizationId:
        workspace.organization.id,
      userId: workspace.user.id,
      role,
    });
  const canManageAll =
    canManageKnowledgeArticles(role);
  const allowedStatus = canManageAll
    ? query.status
    : role === "TECHNICIAN"
      ? query.status === "ARCHIVED"
        ? "ALL"
        : query.status
      : "PUBLISHED";

  const where: Prisma.KnowledgeArticleWhereInput = {
    AND: [
      readScope,
      ...(allowedStatus !== "ALL"
        ? [
            {
              status: allowedStatus,
            },
          ]
        : []),
      ...(query.category !== "ALL"
        ? [
            {
              category: query.category,
            },
          ]
        : []),
      ...(query.query
        ? [
            {
              OR: [
                {
                  title: {
                    contains: query.query,
                    mode: "insensitive" as const,
                  },
                },
                {
                  summary: {
                    contains: query.query,
                    mode: "insensitive" as const,
                  },
                },
                {
                  content: {
                    contains: query.query,
                    mode: "insensitive" as const,
                  },
                },
                {
                  category: {
                    contains: query.query,
                    mode: "insensitive" as const,
                  },
                },
                {
                  tags: {
                    has:
                      query.query.toLowerCase(),
                  },
                },
              ],
            },
          ]
        : []),
    ],
  };

  const [
    totalItems,
    availableCategories,
    publishedCount,
    draftCount,
    archivedCount,
  ] = await prisma.$transaction([
    prisma.knowledgeArticle.count({
      where,
    }),
    prisma.knowledgeArticle.findMany({
      where: readScope,
      distinct: ["category"],
      orderBy: {
        category: "asc",
      },
      select: {
        category: true,
      },
    }),
    prisma.knowledgeArticle.count({
      where: {
        AND: [
          readScope,
          {
            status: "PUBLISHED",
          },
        ],
      },
    }),
    prisma.knowledgeArticle.count({
      where: {
        AND: [
          readScope,
          {
            status: "DRAFT",
          },
        ],
      },
    }),
    prisma.knowledgeArticle.count({
      where: {
        AND: [
          readScope,
          {
            status: "ARCHIVED",
          },
        ],
      },
    }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / PAGE_SIZE),
  );
  const page = Math.min(
    query.page,
    totalPages,
  );
  const articles =
    await prisma.knowledgeArticle.findMany({
      where,
      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: {
          select: {
            name: true,
          },
        },
      },
    });
  const firstItem =
    totalItems === 0
      ? 0
      : (page - 1) * PAGE_SIZE + 1;
  const lastItem =
    totalItems === 0
      ? 0
      : Math.min(
          firstItem + articles.length - 1,
          totalItems,
        );

  return {
    organizationName:
      workspace.organization.name,
    query: {
      ...query,
      status: allowedStatus,
      page,
    },
    articles: articles.map((article) =>
      mapArticle(
        article,
        workspace.organization.timezone,
      ),
    ),
    categories: availableCategories.map(
      (article) => article.category,
    ),
    metrics: [
      {
        label: "Published",
        value: publishedCount,
        description:
          "Available to every active member",
      },
      {
        label: "Categories",
        value: availableCategories.length,
        description:
          "Topics represented in this workspace",
      },
      ...(role === "TECHNICIAN" ||
      canManageAll
        ? [
            {
              label: canManageAll
                ? "Drafts"
                : "Your drafts",
              value: draftCount,
              description:
                role === "TECHNICIAN"
                  ? "Articles you are preparing"
                  : "Articles awaiting publication",
            },
          ]
        : []),
      ...(canManageAll
        ? [
            {
              label: "Archived",
              value: archivedCount,
              description:
                "Retained outside published search",
            },
          ]
        : []),
    ],
    capabilities: {
      canCreate:
        canCreateKnowledgeArticle(role),
      canManageAll,
    },
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      totalItems,
      totalPages,
      firstItem,
      lastItem,
    },
  };
}

function eventSummary(event: {
  action: string;
  fromValue: unknown;
  toValue: unknown;
  metadata: unknown;
}) {
  if (
    event.action ===
    "KNOWLEDGE_ARTICLE_CREATED"
  ) {
    return "Created the first draft.";
  }

  if (
    event.action ===
    "KNOWLEDGE_ARTICLE_STATUS_CHANGED"
  ) {
    const from = event.fromValue as {
      status?: string;
    } | null;
    const to = event.toValue as {
      status?: string;
    } | null;

    return `Status changed from ${(
      from?.status ?? "unknown"
    ).toLowerCase()} to ${(
      to?.status ?? "unknown"
    ).toLowerCase()}.`;
  }

  const metadata = event.metadata as {
    changedFields?: unknown;
  } | null;
  const fields = Array.isArray(
    metadata?.changedFields,
  )
    ? metadata.changedFields.filter(
        (field): field is string =>
          typeof field === "string",
      )
    : [];

  return fields.length > 0
    ? `Updated ${fields.join(", ")}.`
    : "Updated the article.";
}

export async function getKnowledgeArticleData(
  articleId: string,
): Promise<KnowledgeArticleDetailData> {
  const workspace =
    await getAuthorizedWorkspace();
  const role = workspace.membership.role;

  if (!canViewKnowledgeBase(role)) {
    notFound();
  }

  const article =
    await prisma.knowledgeArticle.findFirst({
      where: {
        id: articleId,
        ...getKnowledgeArticleReadScope({
          organizationId:
            workspace.organization.id,
          userId: workspace.user.id,
          role,
        }),
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        events: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
          include: {
            actor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

  if (!article) {
    notFound();
  }

  const canManageStatus =
    canManageKnowledgeArticles(role);

  return {
    article: {
      ...mapArticle(
        article,
        workspace.organization.timezone,
      ),
      content: article.content,
      authorEmail: article.author.email,
      createdAt: formatDate(
        article.createdAt,
        workspace.organization.timezone,
      ),
    },
    capabilities: {
      canEdit: canEditKnowledgeArticle({
        role,
        userId: workspace.user.id,
        article,
      }),
      canManageStatus,
    },
    events: canManageStatus
      ? article.events.map((event) => ({
          id: event.id,
          action: event.action,
          summary: eventSummary(event),
          actorName:
            event.actor?.name ??
            "System or removed user",
          occurredAt: formatDate(
            event.createdAt,
            workspace.organization.timezone,
          ),
        }))
      : [],
  };
}
