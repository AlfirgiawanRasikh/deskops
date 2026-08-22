import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const getWorkspaceSession = cache(
  async () => {
    const requestHeaders = await headers();

    const authSession =
      await auth.api.getSession({
        headers: requestHeaders,
      });

    if (!authSession) {
      return null;
    }

    const membership =
      await prisma.membership.findFirst({
        where: {
          userId: authSession.user.id,
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          role: true,
          status: true,
          department: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              emailVerified: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              timezone: true,
            },
          },
        },
      });

    return {
      authSession,
      membership,
    };
  },
);

export async function requireWorkspaceSession() {
  const currentWorkspace =
    await getWorkspaceSession();

  if (!currentWorkspace) {
    redirect("/sign-in");
  }

  if (!currentWorkspace.membership) {
    redirect("/access-denied");
  }

  const { authSession, membership } =
    currentWorkspace;

  return {
    session: authSession.session,
    user: membership.user,
    membership: {
      id: membership.id,
      role: membership.role,
      status: membership.status,
      department: membership.department,
    },
    organization: membership.organization,
  };
}