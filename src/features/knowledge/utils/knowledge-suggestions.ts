import type { KnowledgeArticleSuggestion } from "@/features/knowledge/types/knowledge-base";

function normalize(value: string) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findKnowledgeSuggestions({
  articles,
  title,
  category,
  limit = 3,
}: {
  articles: KnowledgeArticleSuggestion[];
  title: string;
  category: string;
  limit?: number;
}) {
  const normalizedTitle = normalize(title);
  const normalizedCategory =
    normalize(category);
  const titleWords = [
    ...new Set(
      normalizedTitle
        .split(" ")
        .filter((word) => word.length >= 3),
    ),
  ];

  if (
    titleWords.length === 0 &&
    !normalizedCategory
  ) {
    return [];
  }

  return articles
    .map((article) => {
      const searchable = normalize(
        [
          article.title,
          article.summary,
          article.category,
          ...article.tags,
        ].join(" "),
      );
      const categoryMatches =
        normalizedCategory.length > 0 &&
        normalize(article.category) ===
          normalizedCategory;
      const matchingWords =
        titleWords.filter((word) =>
          searchable.includes(word),
        ).length;
      const phraseMatches =
        normalizedTitle.length >= 5 &&
        searchable.includes(normalizedTitle);
      const score =
        (categoryMatches ? 5 : 0) +
        matchingWords * 2 +
        (phraseMatches ? 3 : 0);

      return {
        article,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.article.title.localeCompare(
          right.article.title,
        ),
    )
    .slice(0, Math.max(0, limit))
    .map((item) => item.article);
}
