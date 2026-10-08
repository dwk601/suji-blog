import "server-only";

import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";

// Request-time only: UI callers must render behind Suspense, never use cache.
export async function getSiteRole(): Promise<"admin" | "owner" | null> {
  // Auth checks expiry with the clock even when headers have been prefetched.
  // Wait for a real request before invoking it, never during prerendering.
  await connection();
  const requestHeaders = await headers();

  try {
    const session = await auth.api.getSession({
      headers: requestHeaders,
      query: { disableCookieCache: true, disableRefresh: true },
    });

    if (!session || session.user.banned) return null;

    const role = session.user.role;
    return role === "admin" || role === "owner" ? role : null;
  } catch (error) {
    unstable_rethrow(error);
    // An unavailable session must neither grant access nor break public pages
    // through their privileged navigation/controls. Do not log session secrets.
    console.warn("Could not verify site privileges.");
    return null;
  }
}
