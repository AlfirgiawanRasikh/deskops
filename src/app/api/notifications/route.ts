import { AuthorizationError } from "@/features/auth/server/authorization";
import { notificationActionSchema } from "@/features/notifications/schemas/notification-actions";
import {
  applyNotificationAction,
  getNotificationCenterData,
} from "@/features/notifications/server/notification-center";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "private, no-store",
};

function authorizationResponse() {
  return Response.json(
    {
      error:
        "You are not authorized to access notifications.",
    },
    {
      status: 401,
      headers: responseHeaders,
    },
  );
}

export async function GET() {
  try {
    const notifications =
      await getNotificationCenterData();

    return Response.json(notifications, {
      headers: responseHeaders,
    });
  } catch (error) {
    if (
      error instanceof AuthorizationError
    ) {
      return authorizationResponse();
    }

    console.error(
      "Notification center read failed.",
      error,
    );

    return Response.json(
      {
        error:
          "DeskOps could not load notifications.",
      },
      {
        status: 500,
        headers: responseHeaders,
      },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      {
        error:
          "Notification action is invalid.",
      },
      {
        status: 400,
        headers: responseHeaders,
      },
    );
  }

  const validation =
    notificationActionSchema.safeParse(
      payload,
    );

  if (!validation.success) {
    return Response.json(
      {
        error:
          validation.error.issues[0]
            ?.message ??
          "Notification action is invalid.",
      },
      {
        status: 400,
        headers: responseHeaders,
      },
    );
  }

  try {
    await applyNotificationAction(
      validation.data,
    );

    return new Response(null, {
      status: 204,
      headers: responseHeaders,
    });
  } catch (error) {
    if (
      error instanceof AuthorizationError
    ) {
      return authorizationResponse();
    }

    console.error(
      "Notification center mutation failed.",
      error,
    );

    return Response.json(
      {
        error:
          "DeskOps could not update notifications.",
      },
      {
        status: 500,
        headers: responseHeaders,
      },
    );
  }
}
