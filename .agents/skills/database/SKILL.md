---
name: database
description: Use when changing src/db/schema.ts, writing Drizzle queries, generating or applying migrations, or running npm run db:generate / db:migrate / db:push / db:studio in suji-blog. Not for Neon platform operations (branches, restore, connection strings) — use neon-postgres.
---

# Database (Drizzle + Neon)

- Driver is `drizzle-orm/neon-http` (`src/db/index.ts`). `db.transaction()` throws at runtime. For atomic multi-statement writes use `db.batch([...])`.
- `drizzle.config.ts` loads `.env.local`, so every `db:*` script hits whatever `DATABASE_URL` points to there. Confirm it is a dev Neon branch before running one.
- Better Auth tables (`user`, `session`, `account`, `verification`) live in `src/db/schema.ts`. Their shape is owned by Better Auth — see the `auth` skill before editing them.

## Unsafe — ask the user first

- `db:push` or `db:migrate` against the production branch.
- Any migration that drops or renames a column/table, or changes a type with data in it.
- Editing or deleting a migration file in `drizzle/` that has already been applied anywhere.

## Flow

Edit schema → `npm run db:generate` → review the SQL in `drizzle/` → `npm run db:migrate` on the dev branch. `db:push` is for throwaway branches only.

verify: `npx tsc --noEmit`; DB-backed behavior verify: TBD — add when the E2E runner exists.
