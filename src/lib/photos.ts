import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { and, desc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { PHOTOS_TAG, invalidatePhotos } from "@/lib/blog-cache";
import { getUploadUrl, publicUrl, r2 } from "@/lib/r2";
import { getSiteRole } from "@/lib/site-role";

const MAX_SIZE = 10 * 1024 * 1024;
const UPLOAD_CHECK_WINDOW = 90_000;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};

export type Photo = {
  key: string; url: string; contentType: string; size: number; createdAt: string;
};
type UploadReceipt = { key: string; contentType: string; size: number; expires: number };

export class PhotoError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function authorize() {
  if (!await getSiteRole()) throw new PhotoError("Only the owner or admin can manage photos.", 403);
}

function metadata(contentType: unknown, size: unknown) {
  if (typeof contentType !== "string" || !Object.hasOwn(extensions, contentType)) {
    throw new PhotoError("Choose a JPEG, PNG, WebP or GIF photo.", 400);
  }
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 1 || size > MAX_SIZE) {
    throw new PhotoError("Photos must be between 1 byte and 10 MB.", 400);
  }
  return { contentType, size };
}

function signature(payload: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("Upload signing is not configured.");
  return createHmac("sha256", secret).update(`photo-upload:${payload}`).digest();
}

function readReceipt(value: unknown): UploadReceipt {
  const invalid = () => new PhotoError("This upload authorization is invalid or expired. Choose the photo again.", 400);
  if (typeof value !== "string" || value.length > 2048) throw invalid();
  const parts = value.split(".");
  const [payload, encodedSignature] = parts;
  if (parts.length !== 2 || !payload || !encodedSignature) throw invalid();
  const supplied = Buffer.from(encodedSignature, "base64url");
  const expected = signature(payload);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw invalid();
  let receipt: UploadReceipt;
  try { receipt = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { throw invalid(); }
  if (!receipt || typeof receipt.key !== "string" || !/^photos\/\d{13}-[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(receipt.key)
      || !Number.isSafeInteger(receipt.expires) || receipt.expires !== uploadDeadline(receipt.key)
      || receipt.expires <= Date.now()) throw invalid();
  metadata(receipt.contentType, receipt.size);
  return receipt;
}

function uploadDeadline(key: string): number {
  const issued = /^photos\/(\d{13})-[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.exec(key);
  return issued ? Number(issued[1]) + UPLOAD_CHECK_WINDOW : 0;
}

function display(photo: typeof photos.$inferSelect): Photo {
  return { ...photo, url: publicUrl(photo.key), createdAt: photo.createdAt.toISOString() };
}

async function readPhotos() {
  "use cache";
  cacheLife("hours");
  cacheTag(PHOTOS_TAG);
  return (await db.select().from(photos).orderBy(desc(photos.createdAt), desc(photos.key))).map(display);
}

export async function listPhotos(): Promise<Photo[]> {
  await authorize();
  return readPhotos();
}

export async function beginPhotoUpload(contentType: unknown, size: unknown) {
  await authorize();
  const checked = metadata(contentType, size);
  const issuedAt = Date.now();
  const key = `photos/${issuedAt}-${randomUUID()}.${extensions[checked.contentType]}`;
  const receipt: UploadReceipt = { key, ...checked, expires: issuedAt + UPLOAD_CHECK_WINDOW };
  const payload = Buffer.from(JSON.stringify(receipt)).toString("base64url");
  return {
    key,
    uploadUrl: await getUploadUrl(key, checked.contentType, checked.size),
    receipt: `${payload}.${signature(payload).toString("base64url")}`,
    headers: { "Content-Type": checked.contentType },
  };
}

export async function completePhotoUpload(value: unknown): Promise<Photo> {
  await authorize();
  const receipt = readReceipt(value);
  const [existing] = await db.select().from(photos).where(eq(photos.key, receipt.key)).limit(1);
  if (existing) {
    invalidatePhotos("route");
    return display(existing);
  }
  let object;
  try {
    object = await r2.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET, Key: receipt.key }));
  } catch (error) {
    if (error instanceof Error && (error.name === "NotFound" || error.name === "NoSuchKey")) {
      throw new PhotoError("The upload has not arrived. Retry uploading the photo.", 409);
    }
    throw error;
  }
  if (object.ContentLength !== receipt.size || object.ContentType !== receipt.contentType) {
    throw new PhotoError("The uploaded photo does not match its approved type and size. Choose it again.", 400);
  }
  // A retry after a lost response is safe: never replace an existing object/row.
  const expires = new Date(receipt.expires).toISOString();
  const [photo] = await db.insert(photos).select(sql`
    SELECT ${receipt.key}::text, ${receipt.contentType}::text, ${receipt.size}::integer, now()
    WHERE clock_timestamp() < ${expires}::timestamptz
  `).onConflictDoNothing().returning();
  const stored = photo ?? (await db.select().from(photos).where(eq(photos.key, receipt.key)).limit(1))[0];
  if (!stored) throw new PhotoError("The photo changed during upload. Try again.", 409);
  invalidatePhotos("route");
  return display(stored);
}

export async function deletePhoto(key: unknown): Promise<void> {
  await authorize();
  if (typeof key !== "string" || key.length > 512) throw new PhotoError("Choose an existing photo to delete.", 400);
  let photo;
  try {
    const deadline = new Date(uploadDeadline(key)).toISOString();
    [photo] = await db.delete(photos).where(and(eq(photos.key, key), sql`clock_timestamp() >= ${deadline}::timestamptz`)).returning();
  } catch (error) {
    const cause = error instanceof Error && "cause" in error ? error.cause : error;
    if (cause && typeof cause === "object" && "code" in cause && ["23001", "23503"].includes(String(cause.code))) {
      throw new PhotoError("This photo is used in a post. Remove it from every post and save before deleting it.", 409);
    }
    throw error;
  }
  if (!photo) {
    const [existing] = await db.select().from(photos).where(eq(photos.key, key)).limit(1);
    if (existing) throw new PhotoError("This new upload can be deleted once its upload check expires (up to 90 seconds). Please retry shortly.", 409);
    throw new PhotoError("This photo is no longer in the library. Refresh the photos.", 404);
  }
  // Delete the row first: the FK rejects in-use photos and prevents new post
  // references while the storage request is in flight.
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: photo.key }));
  } catch (error) {
    await db.insert(photos).values(photo).onConflictDoNothing();
    throw error;
  }
  invalidatePhotos("route");
}
