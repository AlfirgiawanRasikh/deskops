import {
  AuthorizationError,
  getAuthorizedWorkspace,
} from "@/features/auth/server/authorization";
import { canViewOperationalReports } from "@/features/reports/policies/report-authorization";
import { getOperationalReportData } from "@/features/reports/server/get-operational-report-data";
import { createOperationalReportCsv } from "@/features/reports/utils/operational-report-csv";
import { parseOperationalReportRange } from "@/features/reports/utils/report-range";

export const dynamic = "force-dynamic";

function createErrorResponse(
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
      !canViewOperationalReports(
        workspace.membership.role,
      )
    ) {
      return createErrorResponse(
        "You do not have permission to export operational reports.",
        403,
      );
    }

    const requestUrl = new URL(
      request.url,
    );

    const range =
      parseOperationalReportRange(
        requestUrl.searchParams.get(
          "range",
        ) ?? undefined,
      );

    const data =
      await getOperationalReportData(
        range,
      );

    const csv =
      createOperationalReportCsv(data);

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);

    const filename =
      `deskops-operational-report-${range}-${date}.csv`;

    return new Response(
      `\uFEFF${csv}`,
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, no-store",
          "Content-Disposition":
            `attachment; filename="${filename}"`,
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

      return createErrorResponse(
        error.message,
        status,
      );
    }

    console.error(
      "Failed to export operational report:",
      error,
    );

    return createErrorResponse(
      "DeskOps could not export this report.",
      500,
    );
  }
}
