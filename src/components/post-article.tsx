import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { PostContent } from "@/components/post-content";
import { PostControls } from "@/components/post-controls";
import { getPublicPost } from "@/lib/public-posts";
import { getSiteRole } from "@/lib/site-role";
import styles from "./post-article.module.css";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

export async function PostArticle({ postId, comments }: { postId: string; comments?: ReactNode }) {
  const post = await getPublicPost(postId);
  if (!post) notFound();
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <Link href="/posts" className={styles.back}>All posts</Link>
      <article>
        <header className={styles.heading}>
          <h1 className={styles.title}>{post.title}</h1>
          <p className={styles.dates}>
            <time dateTime={post.createdAt.toISOString()}>{dateFormat.format(post.createdAt)}</time>
            {post.updatedAt.getTime() > post.createdAt.getTime() && <> · Updated <time dateTime={post.updatedAt.toISOString()}>{dateFormat.format(post.updatedAt)}</time></>}
          </p>
          <div className={styles.headingActions}>
            {comments && <Link href="#comments" className={styles.discussion}>Join the discussion</Link>}
            <Suspense fallback={null}><ArticleControls postId={post.id} title={post.title} /></Suspense>
          </div>
        </header>
        <div className={styles.body}><PostContent content={post.content} /></div>
        <footer className={styles.exit}>
          <Link href="/posts" className={styles.exitLink}>All posts</Link>
        </footer>
      </article>
      {comments}
    </main>
  );
}

async function ArticleControls({ postId, title }: { postId: string; title: string }) {
  const role = await getSiteRole();
  if (role !== "admin" && role !== "owner") return null;
  return <div className={styles.articleControls}><PostControls postId={postId} title={title} /></div>;
}
