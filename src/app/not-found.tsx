import type { Metadata } from "next";
import Link from "next/link";
import styles from "./posts/posts.module.css";

export const metadata: Metadata = {
  title: "Page not found | Suji Blog",
  description: "This page could not be found. Browse the Suji Blog journal instead.",
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <section className={styles.empty}>
        <h1 className={styles.emptyTitle}>Page not found.</h1>
        <p className={styles.description}>
          This page may have been removed, or the link may be incorrect.
        </p>
        <div className={styles.stateActions}>
          <Link href="/posts" className={styles.link}>Browse posts</Link>
          <Link href="/" className={styles.link}>Back to home</Link>
        </div>
      </section>
    </main>
  );
}
