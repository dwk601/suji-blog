"use server";

import "server-only";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { photos, postPhotos, posts } from "@/db/schema";
import { invalidatePost } from "@/lib/blog-cache";
import { getPostPhotoKeys, validatePostContent, type JSONContent, type PhotoUrls } from "@/lib/post-content";
import { getPublicPost } from "@/lib/public-posts";
import { publicUrl } from "@/lib/r2";
import { getSiteRole } from "@/lib/site-role";

export type PostEditorData = { id: string; title: string; content: JSONContent; photoUrls: PhotoUrls };
export type PostWriteResult = { ok: true; id: string } | { ok: false; error: string };
export type SavePostInput = { id?: string; title: string; content: JSONContent };

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}

export async function getEditorPost(id: string): Promise<PostEditorData | null> {
  if (!(await getSiteRole())) throw new Error("Only the owner or an admin can edit posts.");
  if (!validId(id)) return null;
  const post = await getPublicPost(id);
  if (!post) return null;
  const content = validatePostContent(post.content);
  return {
    id: post.id,
    title: post.title,
    content,
    photoUrls: Object.fromEntries(getPostPhotoKeys(content).map((key) => [key, publicUrl(key)])),
  };
}

export async function savePost(input: SavePostInput): Promise<PostWriteResult> {
  if (!(await getSiteRole())) return { ok: false, error: "Only the owner or an admin can save posts." };
  if (!input || typeof input !== "object" || Array.isArray(input)
    || Object.keys(input).some((key) => !["id", "title", "content"].includes(key))
    || (input.id !== undefined && !validId(input.id))) {
    return { ok: false, error: "Invalid post. Reopen the editor and try again." };
  }
  if (typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 200) {
    return { ok: false, error: "Enter a title between 1 and 200 characters." };
  }
  let content: JSONContent;
  try { content = validatePostContent(input.content); }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Invalid post content." }; }
  const keys = getPostPhotoKeys(content).sort();
  const id = input.id ?? randomUUID();
  const title = input.title.trim();
  try {
    if (keys.length) {
      const knownPhotos = await db.select({ key: photos.key }).from(photos).where(inArray(photos.key, keys));
      if (knownPhotos.length !== keys.length) return { ok: false, error: "A photo is no longer available. Remove it or select another photo, then save again." };
    }
    const write = input.id
      ? db.update(posts).set({ title, content, updatedAt: new Date() }).where(eq(posts.id, id)).returning({ id: posts.id })
      : db.insert(posts).values({ id, title, content }).returning({ id: posts.id });
    const removeReferences = db.delete(postPhotos).where(eq(postPhotos.postId, id));
    // The first statement locks the post before replacing references, so two
    // simultaneous edits cannot combine references from different documents.
    // FK checks also roll back the entire batch if a photo disappears mid-save.
    const [written] = keys.length
      ? await db.batch([write, removeReferences, db.insert(postPhotos).values(keys.map((key) => ({ postId: id, photoKey: key })))])
      : await db.batch([write, removeReferences]);
    if (!written.length) return { ok: false, error: "This post no longer exists. Your changes have not been saved." };
  } catch {
    return { ok: false, error: "Couldn't save the post. Your changes are still here; check the selected photos and try again." };
  }
  invalidatePost(id);
  return { ok: true, id };
}

export async function deletePost(id: string): Promise<PostWriteResult> {
  if (!(await getSiteRole())) return { ok: false, error: "Only the owner or an admin can delete posts." };
  if (!validId(id)) return { ok: false, error: "Invalid post." };
  try {
    // Comments and references cascade; stored photos remain untouched.
    // Idempotent so retrying a lost response can still leave the deleted page.
    await db.delete(posts).where(eq(posts.id, id));
  } catch {
    return { ok: false, error: "Couldn't delete the post. Nothing has been removed; try again." };
  }
  invalidatePost(id);
  return { ok: true, id };
}
