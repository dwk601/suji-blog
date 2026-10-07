---
name: auth
description: Use when touching Better Auth in suji-blog — src/lib/auth.ts, src/lib/auth-client.ts, /api/auth routes, sign-in/sign-up/sign-out, email and password, reading the session, protecting pages, server actions, or route handlers, or adding Better Auth plugins.
---

# Auth (Better Auth, email + password)

- Server session: `auth.api.getSession({ headers: await headers() })`. Client: `useSession` from `src/lib/auth-client.ts`. Never trust client session state for writes.
- Roles are defined in AGENTS.md. Authorize in every server action and route handler that mutates:
  - posts, upload URLs, editing or deleting any comment → owner or admin, not just a session. Sign-up is open, so any commenter has a valid session.
  - creating a comment → a session.
  - editing or deleting a comment → its author, or owner/admin. Check authorship against the session user id, never an id from the request.
  - changing who the owner is → admin only.
- Roles use the Better Auth `admin` plugin (`better-auth/plugins`, not installed yet). It adds `user.role`; adding it follows the schema-regeneration flow below.
  - admin = `role = 'admin'`, set by hand in Neon (`UPDATE "user" SET role = 'admin' WHERE email = '<your email>'`). Never write code, seeds, migrations, or sign-up hooks that grant it.
  - owner = `role = 'owner'`, set by the admin settings action via `auth.api.setRole`. Exactly one owner: demote the previous one in the same `db.batch` (neon-http has no transactions).
  - Keep `adminRoles` = `['admin']` only. Putting `owner` there would expose the plugin's `/api/auth/admin/*` endpoints, including `setRole`, to the owner.
- Read the role from the server session on every privileged write. Never trust a client-sent role or a value cached with `"use cache"`.
- `src/proxy.ts` redirects are UX only, not security.
- With Cache Components, session reads are request-time: wrap in `<Suspense>`; don't call `headers()` inside `"use cache"` (see the Next doc linked in AGENTS.md).
- Auth tables in `src/db/schema.ts` must match what Better Auth expects. After adding a plugin or auth field, run `npx @better-auth/cli generate`, merge the diff into `src/db/schema.ts`, then follow the `database` skill flow.
- `BETTER_AUTH_URL` must equal the serving origin. Vercel preview URLs differ from production, so origin checks fail there unless `trustedOrigins` covers them.
- Keep `nextCookies()` as the last plugin so server actions can set cookies.

## Unsafe — ask the user first

- Any code path that changes the owner other than the admin settings action, or any code path that changes admin.
- Rotating `BETTER_AUTH_SECRET` (invalidates every session).
- Changing password hashing or deleting `account` rows.

verify: TBD — add when the sign-up/sign-in E2E exists.
