import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// Request-time only: UI callers must render behind Suspense, never use cache.
export async function getSiteRole(): Promise<"admin" | "owner" | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true, disableRefresh: true },
  });

  if (!session || session.user.banned) return null;

  const role = session.user.role;
  return role === "admin" || role === "owner" ? role : null;
}
