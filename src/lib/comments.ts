import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { headers } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { db } from "@/db";
import { comments, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { invalidateComments, postTag } from "@/lib/blog-cache";
import { getPublicPost } from "@/lib/public-posts";

export type CommentWriteInput = { postId: string; body: string; commentId?: string };
export type CommentDeleteInput = { postId: string; commentId: string };
export type CommentResult = { ok: true } | { ok: false; error: string };
export type CommentViewer = { id: string; canModerate: boolean } | null;

// React cache is request-local, not a persistent role/session cache.
export const getCommentViewer = cache(async (): Promise<CommentViewer> => {
  // Resolve request-time boundaries before accessing Better Auth's API getter.
  // Keep them outside the catch so prerender control flow is never swallowed.
  await connection();
  const requestHeaders = await headers();
  try {
    const session = await auth.api.getSession({
      headers: requestHeaders,
      query: { disableCookieCache: true, disableRefresh: true },
    });
    if (!session || session.user.banned) return null;
    return { id: session.user.id, canModerate: session.user.role === "admin" || session.user.role === "owner" };
  } catch {
    // Public reading survives a session outage; every write rejects a null viewer.
    console.warn("Could not verify comment privileges.");
    return null;
  }
});

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}

function validInput(value: unknown, fields: string[]): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.keys(value).every((key) => fields.includes(key));
}

function validBody(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 5000;
}

export async function getPublicComments(postId: string) {
  "use cache";
  if (!validId(postId)) return [];
  cacheLife("hours");
  cacheTag(postTag(postId));
  return db.select({
    id: comments.id, postId: comments.postId, authorId: comments.authorId,
    body: comments.body, createdAt: comments.createdAt, updatedAt: comments.updatedAt, authorName: user.name,
  }).from(comments).innerJoin(user, eq(comments.authorId, user.id))
    .where(eq(comments.postId, postId)).orderBy(asc(comments.createdAt), asc(comments.id));
}

export async function createComment(input: CommentWriteInput): Promise<CommentResult> {
  "use server";
  const viewer = await getCommentViewer();
  if (!viewer) return { ok: false, error: "Sign in to leave a comment." };
  if (!validInput(input, ["postId", "body"]) || !validId(input.postId)) return { ok: false, error: "Invalid comment request." };
  if (!validBody(input.body)) return { ok: false, error: "Write a comment between 1 and 5,000 characters." };
  if (!(await getPublicPost(input.postId))) return { ok: false, error: "This post is no longer available." };
  try {
    await db.insert(comments).values({ postId: input.postId, authorId: viewer.id, body: input.body.trim() });
  } catch { return { ok: false, error: "Couldn't add your comment. Your text is still here; try again." }; }
  invalidateComments(input.postId);
  return { ok: true };
}

export async function updateComment(input: CommentWriteInput): Promise<CommentResult> {
  "use server";
  const viewer = await getCommentViewer();
  if (!viewer) return { ok: false, error: "Sign in to edit comments." };
  if (!validInput(input, ["postId", "commentId", "body"]) || !validId(input.postId) || !validId(input.commentId)) return { ok: false, error: "Invalid comment request." };
  if (!validBody(input.body)) return { ok: false, error: "Write a comment between 1 and 5,000 characters." };
  if (!(await getPublicPost(input.postId))) return { ok: false, error: "This post is no longer available." };
  const where = and(eq(comments.id, input.commentId), eq(comments.postId, input.postId), viewer.canModerate ? undefined : eq(comments.authorId, viewer.id));
  try {
    const changed = await db.update(comments).set({ body: input.body.trim(), updatedAt: new Date() }).where(where).returning({ id: comments.id });
    if (!changed.length) return { ok: false, error: "This comment is unavailable or you don't have permission to edit it." };
  } catch { return { ok: false, error: "Couldn't save your comment. Your text is still here; try again." }; }
  invalidateComments(input.postId);
  return { ok: true };
}

export async function deleteComment(input: CommentDeleteInput): Promise<CommentResult> {
  "use server";
  const viewer = await getCommentViewer();
  if (!viewer) return { ok: false, error: "Sign in to delete comments." };
  if (!validInput(input, ["postId", "commentId"]) || !validId(input.postId) || !validId(input.commentId)) return { ok: false, error: "Invalid comment request." };
  if (!(await getPublicPost(input.postId))) return { ok: false, error: "This post is no longer available." };
  const where = and(eq(comments.id, input.commentId), eq(comments.postId, input.postId), viewer.canModerate ? undefined : eq(comments.authorId, viewer.id));
  try {
    const deleted = await db.delete(comments).where(where).returning({ id: comments.id });
    if (!deleted.length) return { ok: false, error: "This comment is unavailable or you don't have permission to delete it." };
  } catch { return { ok: false, error: "Couldn't delete the comment. Check the page and try again." }; }
  invalidateComments(input.postId);
  return { ok: true };
}
