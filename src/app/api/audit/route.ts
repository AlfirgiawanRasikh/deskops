import { canViewAuditLog } from "@/features/audit/policies/audit-authorization";
import { parseAuditLogQuery } from "@/features/audit/schemas/audit-log-query";
import { getAuditLogData } from "@/features/audit/server/get-audit-log-data";
import { createAuditLogCsv } from "@/features/audit/utils/audit-log-csv";
import {
  AuthorizationError,
  getAuthorizedWorkspace,
} from "@/features/auth/server/authorization";

export const dynamic = "force-dynamic";

function errorResponse(
  message: string,
  status: number,
) {
  return Response.json(
    {
      message,
    },
    {
      status,
      headers: {
        "Cache-Control":
          "private, no-store",
      },
    },
  );
}

export async function GET(
  request: Request,
) {
  try {
    const workspace =
      await getAuthorizedWorkspace();

    if (
      !canViewAuditLog(
        workspace.membership.role,
      )
    ) {
      return errorResponse(
        "You do not have permission to export the audit log.",
        403,
      );
    }

    const requestUrl = new URL(
      request.url,
    );
    const query = parseAuditLogQuery({
      q:
        requestUrl.searchParams.get(
          "q",
        ) ?? undefined,
      category:
        requestUrl.searchParams.get(
          "category",
        ) ?? undefined,
      actor:
        requestUrl.searchParams.get(
          "actor",
        ) ?? undefined,
      range:
        requestUrl.searchParams.get(
          "range",
        ) ?? undefined,
      page: "1",
    });

    const data = await getAuditLogData(
      query,
      {
        pageSize: 5_000,
        firstPageOnly: true,
      },
    );
    const csv = createAuditLogCsv(data);
    const date = new Date()
      .toISOString()
      .slice(0, 10);

    return new Response(
      `\uFEFF${csv}`,
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, no-store",
          "Content-Disposition":
            `attachment; filename="deskops-audit-log-${query.range}-${date}.csv"`,
          "Content-Type":
            "text/csv; charset=utf-8",
          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (error) {
    if (
      error instanceof
      AuthorizationError
    ) {
      const status =
        error.message ===
        "You must sign in to continue."
          ? 401
          : 403;

      return errorResponse(
        error.message,
        status,
      );
    }

    console.error(
      "Failed to export audit log:",
      error,
    );

    return errorResponse(
      "DeskOps could not export the audit log.",
      500,
    );
  }
}
