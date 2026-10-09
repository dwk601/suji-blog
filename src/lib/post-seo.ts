import "server-only";

import type { Metadata } from "next";
import { validatePostContent, type JSONContent } from "@/lib/post-content";
import type { PublicPost } from "@/lib/public-posts";
import { getSiteUrl } from "@/lib/seo";

function plainText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (["hardBreak", "horizontalRule", "image"].includes(node.type ?? "")) return " ";

  const text = (node.content ?? []).map(plainText).join("");
  // Keep adjacent marked text together, but separate paragraphs and list items.
  return ["paragraph", "heading", "codeBlock"].includes(node.type ?? "") ? `${text} ` : text;
}

function descriptionFor(post: PublicPost): string {
  const text = plainText(validatePostContent(post.content)).replace(/\s+/gu, " ").trim();
  const description = text || `Read “${post.title}” in the Suji Blog journal.`;
  // Grapheme boundaries preserve Hangul, combining characters, and emoji.
  const segments = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(description);
  const characters: string[] = [];
  for (const { segment } of segments) {
    if (characters.length === 160) return `${characters.slice(0, 159).join("").trimEnd()}…`;
    characters.push(segment);
  }
  return description;
}

export function getPostSeo(post: PublicPost): { metadata: Metadata; jsonLd: string } {
  const title = `${post.title} | Suji Blog`;
  const description = descriptionFor(post);
  const url = getSiteUrl(`/posts/${encodeURIComponent(post.id)}`);
  const image = getSiteUrl("/og-image.png");
  const publishedTime = post.createdAt.toISOString();
  const modifiedTime = post.updatedAt.toISOString();

  return {
    metadata: {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "article",
        title,
        description,
        url,
        siteName: "Suji Blog",
        images: [{ url: image, alt: "Suji Blog" }],
        publishedTime,
        modifiedTime,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [{ url: image, alt: "Suji Blog" }],
      },
    },
    // Escaping '<' prevents stored text from closing the JSON-LD script element.
    jsonLd: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description,
      url,
      mainEntityOfPage: url,
      image,
      datePublished: publishedTime,
      dateModified: modifiedTime,
    }).replace(/</g, "\\u003c"),
  };
}
