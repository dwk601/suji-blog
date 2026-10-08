import "server-only";

import Link from "next/link";
import { Suspense } from "react";
import { createComment, deleteComment, getCommentViewer, getPublicComments, updateComment } from "@/lib/comments";
import { getPublicPost } from "@/lib/public-posts";
import { getNextPostPath } from "@/components/auth/next-path";
import { CommentControls } from "./comment-controls";
import { CommentForm } from "./comment-form";
import styles from "./comments.module.css";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export function Comments({ postId }: { postId: string }) {
  return (
    <section id="comments" className={styles.section} aria-label="Comments">
      <h2 className={styles.title} tabIndex={-1}>Comments</h2>
      <div id="comment-form" className={styles.composer} tabIndex={-1}>
        <Suspense fallback={<p className={styles.hint} role="status">Loading comment form…</p>}><CommentComposer postId={postId} /></Suspense>
      </div>
      <Suspense fallback={<p className={styles.hint} role="status">Loading comments…</p>}><CommentList postId={postId} /></Suspense>
    </section>
  );
}

async function CommentList({ postId }: { postId: string }) {
  const comments = await getPublicComments(postId);
  if (!comments.length) return <p className={styles.empty}>No comments yet. Start the conversation.</p>;
  return (
    <ol className={styles.list}>
      {[...comments].reverse().map((comment) => <li key={comment.id} className={styles.comment}>
        <article>
          <header className={styles.heading}>
            <h3 className={styles.author}>{comment.authorName}</h3>
            <p className={styles.hint}><time dateTime={comment.createdAt.toISOString()}>{dateFormat.format(comment.createdAt)}</time>{comment.updatedAt.getTime() > comment.createdAt.getTime() && " · Edited"}</p>
          </header>
          <p className={styles.body}>{comment.body}</p>
          <Suspense fallback={null}><CommentActions postId={postId} commentId={comment.id} authorId={comment.authorId} body={comment.body} /></Suspense>
        </article>
      </li>)}
    </ol>
  );
}

async function CommentActions({ postId, commentId, authorId, body }: { postId: string; commentId: string; authorId: string; body: string }) {
  const viewer = await getCommentViewer();
  if (!viewer || (!viewer.canModerate && viewer.id !== authorId)) return null;
  return <CommentControls postId={postId} commentId={commentId} body={body} updateAction={updateComment} deleteAction={deleteComment} />;
}

async function CommentComposer({ postId }: { postId: string }) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(postId) || !(await getPublicPost(postId))) return null;
  const viewer = await getCommentViewer();
  const returnTo = encodeURIComponent(getNextPostPath(`/posts/${postId}#comment-form`));
  if (!viewer) return (
    <div className={styles.signIn}>
      <p>Join the conversation. Everyone can read the comments.</p>
      <div className={styles.authActions}>
        <Link href={`/sign-in?next=${returnTo}`}>Sign in</Link>
        <Link href={`/sign-up?next=${returnTo}`}>Create account</Link>
      </div>
    </div>
  );
  return <CommentForm postId={postId} submitAction={createComment} />;
}
