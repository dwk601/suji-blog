import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getPublicPost } from "@/lib/public-posts";
import { Comments } from "@/components/comments";
import { PostArticle } from "@/components/post-article";
import styles from "@/components/post-article.module.css";

type PostPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPublicPost(id);
  if (!post) return { title: "Post not found | Suji Blog", robots: { index: false } };

  const title = `${post.title} | Suji Blog`;
  const description = `Read “${post.title}” in the Suji Blog journal.`;
  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      siteName: "Suji Blog",
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
  };
}

export default function PostPage({ params }: PostPageProps) {
  return (
    <Suspense fallback={
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <Link href="/posts" className={styles.back}>All posts</Link>
        <p role="status">Loading post…</p>
      </main>
    }>
      <PublicPost params={params} />
    </Suspense>
  );
}

async function PublicPost({ params }: PostPageProps) {
  const { id } = await params;
  return <PostArticle postId={id} comments={<Comments postId={id} />} />;
}
