import { AuthorizationError } from "@/features/auth/server/authorization";
import { parseGlobalSearchQuery } from "@/features/search/schemas/global-search-query";
import { searchWorkspace } from "@/features/search/server/search-workspace";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "private, no-store",
};

export async function GET(
  request: Request,
) {
  const requestUrl = new URL(
    request.url,
  );

  const parsedQuery =
    parseGlobalSearchQuery(
      requestUrl.searchParams.get("q"),
    );

  if (!parsedQuery.success) {
    return Response.json(
      {
        error:
          parsedQuery.error.issues[0]
            ?.message ??
          "Search query is invalid.",
      },
      {
        status: 400,
        headers: responseHeaders,
      },
    );
  }

  try {
    const results =
      await searchWorkspace(
        parsedQuery.data,
      );

    return Response.json(results, {
      headers: responseHeaders,
    });
  } catch (error) {
    if (
      error instanceof
      AuthorizationError
    ) {
      return Response.json(
        {
          error:
            "You are not authorized to search this workspace.",
        },
        {
          status: 401,
          headers: responseHeaders,
        },
      );
    }

    console.error(
      "Workspace search failed.",
      error,
    );

    return Response.json(
      {
        error:
          "DeskOps could not complete the search.",
      },
      {
        status: 500,
        headers: responseHeaders,
      },
    );
  }
}
