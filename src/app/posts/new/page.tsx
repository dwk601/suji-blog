import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostComposer } from "@/components/post-composer";
import { getSiteRole } from "@/lib/site-role";
import styles from "../manage/manage.module.css";

export const metadata: Metadata = { title: "New post | Suji Blog" };

export default function NewPostPage() {
  return (
    <main id="main-content" className={styles.page}>
      <Suspense fallback={<p role="status">Loading post editor…</p>}>
        <NewPostContent />
      </Suspense>
    </main>
  );
}

async function NewPostContent() {
  if (!(await getSiteRole())) notFound();
  return (
    <>
      <header className={styles.heading}>
        <h1 className={styles.title}>New post</h1>
      </header>
      <div style={{ paddingBlockStart: "2rem" }}>
        <PostComposer />
      </div>
    </>
  );
}
