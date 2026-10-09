import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPublicPost } from "@/lib/public-posts";
import { getPostSeo } from "@/lib/post-seo";
import { Comments } from "@/components/comments";
import { PostArticle } from "@/components/post-article";
import styles from "@/components/post-article.module.css";

type PostPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPublicPost(id);
  if (!post) {
    return {
      title: "Post not found | Suji Blog",
      description: null,
      robots: { index: false },
      alternates: { canonical: null },
      openGraph: null,
      twitter: null,
    };
  }

  return getPostSeo(post).metadata;
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
  const post = await getPublicPost(id);
  if (!post) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: getPostSeo(post).jsonLd }}
      />
      <PostArticle postId={id} comments={<Comments postId={id} />} />
    </>
  );
}
