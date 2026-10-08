"use client";

import Link from "next/link";
import { useTransition } from "react";
import styles from "./posts/posts.module.css";

export default function ErrorPage({ retry }: { retry: () => void }) {
  const [isPending, startTransition] = useTransition();

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <section className={styles.empty}>
        <h1 className={styles.emptyTitle}>This page is unavailable.</h1>
        <p className={styles.description} role="alert">
          We couldn’t load this page. Try again, or return to the journal.
        </p>
        <div className={styles.stateActions}>
          <button
            type="button"
            className={`${styles.link} ${styles.retry}`}
            disabled={isPending}
            onClick={() => startTransition(retry)}
          >
            {isPending ? "Trying again…" : "Try again"}
          </button>
          <Link href="/posts" className={styles.link}>Browse posts</Link>
          <Link href="/" className={styles.link}>Back to home</Link>
        </div>
      </section>
    </main>
  );
}
