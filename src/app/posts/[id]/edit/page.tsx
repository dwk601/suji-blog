import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostComposer } from "@/components/post-composer";
import { getEditorPost } from "@/lib/posts";
import { getSiteRole } from "@/lib/site-role";
import styles from "../../manage/manage.module.css";

export const metadata: Metadata = {
  title: "Edit post | Suji Blog",
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

type EditPostProps = { params: Promise<{ id: string }> };

export default function EditPostPage({ params }: EditPostProps) {
  return (
    <main id="main-content" className={styles.page}>
      <Suspense fallback={<p role="status">Loading post editor…</p>}>
        <EditPostContent params={params} />
      </Suspense>
    </main>
  );
}

async function EditPostContent({ params }: EditPostProps) {
  if (!(await getSiteRole())) notFound();
  const { id } = await params;
  const post = await getEditorPost(id);
  if (!post) notFound();
  return (
    <>
      <header className={styles.heading}>
        <h1 className={styles.title}>Edit post</h1>
      </header>
      <div className={styles.composer}>
        <PostComposer key={post.id} initialPost={post} />
      </div>
    </>
  );
}
