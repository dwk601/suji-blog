<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# suji-blog

A modern blog website. Not a static or boring one: all post CRUD happens in the website (Tiptap editor, photo uploads), on top of fast public reading and comments.

## Roles

- **admin** — the site maintainer's account, marked by hand in Neon via the Better Auth admin plugin's `role` (no app path grants it). Everything the owner can do, plus picks the owner on the settings page.
- **owner** — the one account set by the admin; full CRUD on everything (posts, photos, any comment).
- **reader** — anonymous; reads posts and comments without signing up.
- **commenter** — any signed-up user; can comment and edit or delete only their own comments.

Sign-up is open (commenters need it), so "signed in" never implies owner or admin. Every privileged action needs an explicit role check — see the `auth` skill.

## Gotchas

- `cacheComponents` + `partialPrefetching` are on. Any request read (`cookies()`, `headers()`, session) must sit behind `<Suspense>` or the build fails. Read `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md` before touching session-dependent UI. Public post pages must render without a session; only the session-dependent parts (comment form, owner controls) go behind `<Suspense>`.
- `middleware.ts` is deprecated; the file is `src/proxy.ts`. Proxy checks are optimistic only — see the `auth` skill.
- Vercel Hobby: request bodies cap at ~4.5 MB and functions have short timeouts. Never stream file bytes through the app; photos go browser → R2 directly (`photos` skill).
- Comments are user-authored; never render them with `dangerouslySetInnerHTML`. Post content rules live in the `posts` skill.
- `.env*` is gitignored except `.env.example`. Add new env vars to `.env.example` (names only) and to Vercel; never commit values.

## Standing rules

- Write clean code: clear names, small focused functions, no dead code or speculative abstractions.
- Never save docs or plans to the repo (no README additions, docs/, plan files, decision logs, or summaries) unless the user explicitly asks.
- Write as few tests as possible. Tests must not slow development. No unit tests for implementation details; prove behavior with E2E on real user workflows.
- Before adding a test, answer: What observable behavior or contract does it protect? What credible regression fails it? Why doesn't existing coverage already catch that? Does it need a production seam (export, flag, wrapper) no real caller needs? Any missing answer means don't add it.
- Each contract gets one test, at the strongest boundary. Extend an existing case or table instead of adding a near-duplicate. Never add: assertion-free coverage probes, mocks that implement the behavior under test, expected values computed by the code under test, copied fixtures or export lists, source or string greps, private-helper tests, or test-only exports.
- A test that breaks under a behavior-preserving refactor asserts implementation; rewrite it at the real boundary or delete it.
- Bug fix: one regression test at the owning boundary, and it must fail on the pre-fix code.
- While developing, run only the focused test for the change. Run the full suite once before handoff.

## Testing

- Focused E2E: `TBD` — no runner yet.
- Full suite: `TBD` — no runner yet.
- Always-available gates: `npm run lint` and `npx tsc --noEmit`.

## Skill map (`.agents/skills/`)

- `database` — Drizzle schema, migrations, queries, anything that runs `db:*` scripts.
- `auth` — Better Auth config, sessions, sign-in/up, protecting routes or server actions.
- `posts` — Tiptap editor, post content storage and rendering.
- `photos` — R2 uploads, presigned URLs, displaying stored images.
- `impeccable` — any UI/visual design, layout, motion, or polish work.
- `neon` / `neon-postgres` — Neon platform: branches, connection strings, restore.
- `cloudflare` — Cloudflare product/config questions beyond the app's R2 usage. `basin` is not used by this project.
- Never link `alfrex-*` shared skills into this repo.

## Maintain

Prune instead of append; point instead of copy. Each rule lives in one place — here or one skill.
