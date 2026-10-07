import "server-only";

import { revalidateTag, updateTag } from "next/cache";

export const POSTS_TAG = "posts";
export const PHOTOS_TAG = "photos";

export function postTag(id: string): string {
  return `post:${id}`;
}

// Actions update the client router too; routes must expire data without SWR.
export type BlogWriteContext = "action" | "route";

function invalidate(tags: string[], context: BlogWriteContext): void {
  for (const tag of tags) {
    if (context === "action") updateTag(tag);
    else revalidateTag(tag, { expire: 0 });
  }
}

export function invalidatePost(id: string, context: BlogWriteContext = "action"): void {
  invalidate([POSTS_TAG, postTag(id)], context);
}

export function invalidateComments(postId: string, context: BlogWriteContext = "action"): void {
  invalidate([postTag(postId)], context);
}

export function invalidatePhotos(context: BlogWriteContext = "action"): void {
  invalidate([PHOTOS_TAG], context);
}
