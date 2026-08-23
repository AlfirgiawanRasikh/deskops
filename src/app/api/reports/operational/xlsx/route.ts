import {
  AuthorizationError,
  getAuthorizedWorkspace,
} from "@/features/auth/server/authorization";
import { canViewOperationalReports } from "@/features/reports/policies/report-authorization";
import { getOperationalReportData } from "@/features/reports/server/get-operational-report-data";
import { createOperationalReportWorkbook } from "@/features/reports/utils/operational-report-workbook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const workspace =
      await getAuthorizedWorkspace();

    if (
      !canViewOperationalReports(
        workspace.membership.role,
      )
    ) {
      return Response.json(
        {
          message: "Not found.",
        },
        {
          status: 404,
        },
      );
    }

    const requestUrl = new URL(
      request.url,
    );

    const data =
      await getOperationalReportData(
        requestUrl.searchParams.get(
          "range",
        ) ?? undefined,
      );

    const workbook =
      await createOperationalReportWorkbook(
        data,
      );

    const fileName =
      `deskops-operational-report-${data.range}.xlsx`;

    return new Response(
      Uint8Array.from(workbook),
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
          "Content-Disposition":
            `attachment; filename="${fileName}"`,
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json(
        {
          message: error.message,
        },
        {
          status: 401,
        },
      );
    }

    throw error;
  }
}
