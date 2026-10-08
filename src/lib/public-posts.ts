import "server-only";

import { desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { POSTS_TAG, postTag } from "@/lib/blog-cache";

export type PublicPost = typeof posts.$inferSelect;
export type PublicPostSummary = Pick<PublicPost, "id" | "title" | "createdAt" | "updatedAt">;

// Public reads never depend on a session. Even missing IDs are tagged so a
// subsequent save invalidates their cached null result.
export async function getPublicPost(id: string): Promise<PublicPost | null> {
  "use cache";
  cacheLife("hours");
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) return null;
  cacheTag(postTag(id));

  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return post ?? null;
}

export async function getPublicPosts(): Promise<PublicPostSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);

  return db.select({
    id: posts.id,
    title: posts.title,
    createdAt: posts.createdAt,
    updatedAt: posts.updatedAt,
  }).from(posts).orderBy(desc(posts.createdAt), desc(posts.id));
}
