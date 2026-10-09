import type { MetadataRoute } from "next";
import { getPublicPosts } from "@/lib/public-posts";
import { getSiteUrl, isPreviewDeployment } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isPreviewDeployment) return [];

  // Reuse the public posts cache and its tag so saves/deletes invalidate discovery.
  const posts = await getPublicPosts();

  return [
    { url: getSiteUrl("/") },
    { url: getSiteUrl("/posts") },
    ...posts.map((post) => ({
      url: getSiteUrl(`/posts/${encodeURIComponent(post.id)}`),
      lastModified: post.updatedAt,
    })),
  ];
}
