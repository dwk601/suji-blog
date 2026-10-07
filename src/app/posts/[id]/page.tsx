import { Suspense } from "react";
import { Comments } from "@/components/comments";
import { PostArticle } from "@/components/post-article";
import styles from "@/components/post-article.module.css";

type PostPageProps = { params: Promise<{ id: string }> };

export default function PostPage({ params }: PostPageProps) {
  return (
    <Suspense fallback={
      <main id="main-content" className={styles.page}>
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
