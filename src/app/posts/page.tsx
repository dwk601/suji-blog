import Link from "next/link";
import { Suspense } from "react";
import { getPublicPosts } from "@/lib/public-posts";
import { getPublicPageMetadata } from "@/lib/seo";
import styles from "./posts.module.css";

export const metadata = getPublicPageMetadata(
  "Posts | Suji Blog",
  "Browse the Suji Blog journal: personal writing, everyday observations, and reflections, gathered in one place.",
  "/posts",
);

export default function PostsPage() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <header className={styles.heading}>
        <h1 className={styles.title}>Posts</h1>
        <p className={styles.introduction}>
          The journal, gathered in one place.
        </p>
      </header>

      <Suspense
        fallback={
          <section className={styles.empty}>
            <p className={styles.description} role="status">Loading posts…</p>
            <Link href="/" className={styles.link}>Back to home</Link>
          </section>
        }
      >
        <PostsList />
      </Suspense>
    </main>
  );
}

async function PostsList() {
  const posts = await getPublicPosts();

  if (!posts.length) {
    return (
      <section className={styles.empty} aria-labelledby="empty-title">
        <h2 id="empty-title" className={styles.emptyTitle}>
          No posts yet.
        </h2>
        <p className={styles.description}>
          New writing will appear here. Come back soon.
        </p>
        <Link href="/" className={styles.link}>
          Back to home
        </Link>
      </section>
    );
  }

  return (
    <ul className={styles.list}>
      {posts.map((post) => (
        <li key={post.id} className={styles.row}>
          <h2 className={styles.postTitle}>
            <Link href={`/posts/${post.id}`}>{post.title}</Link>
          </h2>
          <time className={styles.date} dateTime={post.createdAt.toISOString()}>
            {new Intl.DateTimeFormat("en", {
              dateStyle: "long",
              timeZone: "UTC",
            }).format(post.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
