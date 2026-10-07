import Link from "next/link";
import styles from "./home.module.css";

export default function Home() {
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <h1 id="home-title" className={styles.title}>
          Suji Blog
        </h1>
        <p className={styles.statement}>
          A little space for
          <br />
          <em>life, in words.</em>
        </p>
      </section>

      <div className={styles.introduction}>
        <p>
          Thoughts, observations, and the things worth keeping. Welcome to my
          personal blog.
        </p>
      </div>

      <section className={styles.journal} aria-labelledby="journal-title">
        <div>
          <h2 id="journal-title" className={styles.sectionTitle}>
            The journal
          </h2>
          <p className={styles.description}>
            No posts yet. Published posts will appear here.
          </p>
        </div>
        <Link href="/posts" className={styles.link}>
          View posts
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M4 12h15m-6-6 6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </section>
    </main>
  );
}
