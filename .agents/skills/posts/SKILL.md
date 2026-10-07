---
name: posts
description: Use when working on blog posts in suji-blog — the Tiptap editor (src/components/editor.tsx), Tiptap extensions, saving or loading post content, rendering posts on public pages, or images embedded in posts.
---

# Posts (Tiptap)

- Store post content as Tiptap JSON (`editor.getJSON()`) in a `jsonb` column. Never store HTML. JSON is the maintainable source; any output format is derived at render time.
- Define the Tiptap extension list once and import it in both the editor and the renderer. If the lists drift, nodes silently disappear from published posts.
- Render public posts on the server with `@tiptap/static-renderer` (not installed yet; add it with the same version as the other `@tiptap/*` packages). Don't load the editor on read-only pages and don't use `dangerouslySetInnerHTML`.
- Saving content is owner/admin only (`auth` skill). Treat the posted JSON as untrusted: validate it against the shared extensions, and drop `href` values that aren't http(s) or mailto.
- Image nodes carry the R2 key, and the URL is resolved at render time (`photos` skill), so changing `R2_PUBLIC_URL` never requires rewriting posts.
- The editor is client-only. Keep `immediatelyRender: false` or SSR hydration breaks.
- Adding an extension is backward compatible. Removing or renaming one breaks existing posts, so ask first and plan a data migration (`database` skill).

verify: TBD — add when the create → publish → read post E2E exists.
