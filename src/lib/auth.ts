import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { db } from "@/db";
import * as schema from "@/db/schema";

// Preview deployments inherit production env vars. Use this deployment's
// exact URL there, and trust only explicitly configured/current serving origins
// (including Vercel's branch alias), never all of *.vercel.app or request headers.
const configuredOrigin = process.env.BETTER_AUTH_URL
  ? new URL(process.env.BETTER_AUTH_URL).origin
  : undefined;
const deploymentOrigin = process.env.VERCEL_URL
  ? new URL(`https://${process.env.VERCEL_URL}`).origin
  : undefined;
const branchOrigin = process.env.VERCEL_BRANCH_URL
  ? new URL(`https://${process.env.VERCEL_BRANCH_URL}`).origin
  : undefined;
const baseURL = process.env.VERCEL_ENV === "preview"
  ? deploymentOrigin ?? configuredOrigin
  : configuredOrigin ?? deploymentOrigin;

if (!baseURL) throw new Error("Set BETTER_AUTH_URL to the serving origin.");

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [...new Set([configuredOrigin, deploymentOrigin, branchOrigin]
    .filter((origin): origin is string => Boolean(origin)))],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  // Every session read must reflect demotions immediately, not a role in a cookie.
  session: { cookieCache: { enabled: false } },
  // Roles are assigned only by the atomic settings action; admin is SQL-only.
  // These plugin endpoints can otherwise bypass that contract, even as admin.
  disabledPaths: ["/admin/set-role", "/admin/create-user", "/admin/update-user"],
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
      roles: { admin: adminAc, user: userAc, owner: userAc },
    }),
    nextCookies(),
  ],
});
