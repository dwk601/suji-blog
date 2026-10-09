import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostControls } from "@/components/post-controls";
import { getPublicPosts } from "@/lib/public-posts";
import { getSiteRole } from "@/lib/site-role";
import styles from "./manage.module.css";

export const metadata: Metadata = {
  title: "Manage posts | Suji Blog",
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

export default function ManagePostsPage() {
  return (
    <main id="main-content" className={styles.page}>
      <Suspense fallback={<p role="status">Loading post management…</p>}><ManagePosts /></Suspense>
    </main>
  );
}

async function ManagePosts() {
  if (!(await getSiteRole())) notFound();
  const posts = await getPublicPosts();
  return (
    <>
      <header className={styles.heading}>
        <div><h1 className={styles.title}>Manage posts</h1><p className={styles.description}>All saved posts are public.</p></div>
        <Link href="/posts/new" className={styles.newPost}>New post</Link>
      </header>
      {posts.length ? (
        <ul className={styles.list}>
          {posts.map((post) => (
            <li key={post.id} className={styles.row}>
              <div>
                <h2 className={styles.postTitle}><Link href={`/posts/${post.id}`}>{post.title}</Link></h2>
                <p className={styles.date}>Saved <time dateTime={post.updatedAt.toISOString()}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(post.updatedAt)}</time></p>
              </div>
              <PostControls postId={post.id} title={post.title} />
            </li>
          ))}
        </ul>
      ) : <section className={styles.empty}><h2>No posts yet.</h2><p>Write your first post. Saving it will make it available to everyone.</p><Link href="/posts/new">Create a post</Link></section>}
    </>
  );
}
