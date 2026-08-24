export type GlobalSearchResultKind =
  | "ticket"
  | "asset"
  | "person";

export type GlobalSearchResult = {
  id: string;
  kind: GlobalSearchResultKind;
  title: string;
  subtitle: string;
  context: string;
  href: string;
};

export type GlobalSearchGroup = {
  key: GlobalSearchResultKind;
  label: string;
  results: GlobalSearchResult[];
};

export type GlobalSearchResponse = {
  query: string;
  groups: GlobalSearchGroup[];
};

export type GlobalSearchErrorResponse = {
  error: string;
};
