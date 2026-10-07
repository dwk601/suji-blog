import type { Metadata } from "next";
import Link from "next/link";
import styles from "./posts.module.css";

export const metadata: Metadata = {
  title: "Posts | Suji Blog",
  description: "The journal at Suji Blog. Thoughts, observations, and personal writing.",
};

export default function PostsPage() {
  return (
    <main id="main-content" className={styles.page}>
      <header className={styles.heading}>
        <h1 className={styles.title}>Posts</h1>
        <p className={styles.introduction}>
          The journal, gathered in one place.
        </p>
      </header>

      <section className={styles.empty} aria-labelledby="empty-title">
        <h2 id="empty-title" className={styles.emptyTitle}>
          No posts yet.
        </h2>
        <p className={styles.description}>
          Published posts will appear here.
        </p>
        <Link href="/" className={styles.link}>
          Back to home
        </Link>
      </section>
    </main>
  );
}
