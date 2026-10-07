import "server-only";

import { PhotoError } from "@/lib/photos";

export async function readPhotoBody(request: Request): Promise<Record<string, unknown>> {
  const origin = new URL(process.env.BETTER_AUTH_URL ?? request.url).origin;
  if (request.headers.get("origin") !== origin) {
    throw new PhotoError("Photo requests must come from this website.", 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new PhotoError("Send photo metadata as JSON, not file bytes.", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new PhotoError("Photo metadata is missing.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      throw new PhotoError("Photo metadata is too large. Upload bytes directly to storage.", 413);
    }
    chunks.push(value);
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new PhotoError("Photo metadata is invalid. Try again.", 400); }
}

export async function photoResponse(operation: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await operation(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PhotoError) {
      return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    }
    console.error("Photo operation failed", error instanceof Error ? error.name : "Unknown error");
    return Response.json({ error: "Photos are unavailable right now. Please retry." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
