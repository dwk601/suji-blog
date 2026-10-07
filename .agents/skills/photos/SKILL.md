---
name: photos
description: Use when uploading, storing, or displaying photos/images in suji-blog — Cloudflare R2, src/lib/r2.ts, presigned upload URLs, R2_* env vars, bucket CORS, image URLs, or next/image config for R2. Not for general Cloudflare product questions — use cloudflare.
---

# Photos (Cloudflare R2)

- Upload path: server issues a presigned PUT (`getUploadUrl` in `src/lib/r2.ts`) → browser PUTs bytes straight to R2 → server stores the key. File bytes never pass through a Vercel function (Hobby body limit).
- Only issue a presigned URL after an owner/admin check (`auth` skill); commenters can't upload. The server builds the object key; never accept a key or path from the client.
- Allowlist `contentType` server-side. A presigned PUT does not cap size by itself; sign `ContentLength` if you need a limit.
- Store the R2 key in Postgres, not the full URL; derive display URLs with `publicUrl(key)` (`R2_PUBLIC_URL`).
- Browser PUTs need bucket CORS allowing `PUT` + `Content-Type` from localhost, production, and Vercel preview origins. A CORS failure looks like a network error in the browser, not an R2 error.
- `next/image` needs the `R2_PUBLIC_URL` host in `images.remotePatterns`. Vercel Hobby has a limited image-optimization quota; check it before routing every photo through the optimizer.

## Unsafe — ask the user first

- Deleting objects or changing bucket CORS/public access.

verify: TBD — add when the upload E2E exists.
