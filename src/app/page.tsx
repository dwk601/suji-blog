import Link from "next/link";
import { Suspense } from "react";
import { getPublicPosts } from "@/lib/public-posts";
import styles from "./home.module.css";

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <h1 id="home-title" className={styles.title}>
          Suji Blog
        </h1>
        <p className={styles.statement}>A little space for life, in words.</p>
        <div className={styles.introduction}>
          <p>
            Thoughts, observations, and the things worth keeping. Welcome to my
            personal blog.
          </p>
        </div>
      </section>

      <section className={styles.journal} aria-labelledby="journal-title">
        <div className={styles.journalHeading}>
          <h2 id="journal-title" className={styles.sectionTitle}>
            The journal
          </h2>
          <Link href="/posts" className={styles.link}>
            View posts
          </Link>
        </div>
        <Suspense
          fallback={
            <p className={styles.state} role="status">
              Loading posts…
            </p>
          }
        >
          <LatestPosts />
        </Suspense>
      </section>
    </main>
  );
}

async function LatestPosts() {
  const posts = (await getPublicPosts()).slice(0, 3);

  if (!posts.length) {
    return (
      <p className={styles.state}>
        No posts yet. New writing will appear here.
      </p>
    );
  }

  return (
    <ul className={styles.postList}>
      {posts.map((post) => (
        <li key={post.id}>
          <h3 className={styles.postTitle}>
            <Link href={`/posts/${post.id}`}>{post.title}</Link>
          </h3>
          <time className={styles.date} dateTime={post.createdAt.toISOString()}>
            {new Intl.DateTimeFormat("en", {
              dateStyle: "medium",
              timeZone: "UTC",
            }).format(post.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
