"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { deletePost } from "@/lib/posts";
import styles from "./post-article.module.css";

export function PostControls({ postId, title }: { postId: string; title: string }) {
  const router = useRouter();
  const id = useId();
  const deleteButton = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function remove() {
    if (pending) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await deletePost(postId);
        if (!result.ok) { setError(result.error); return; }
        router.push("/posts/manage");
      } catch {
        setError("Couldn't confirm deletion. Check your connection and try again.");
      }
    });
  }

  return (
    <div className={styles.controls} aria-busy={pending}>
      <div className={styles.controlActions}>
        <Link href={`/posts/${postId}/edit`} aria-disabled={pending} onClick={(event) => { if (pending) event.preventDefault(); }}>Edit post</Link>
        <button type="button" ref={deleteButton} disabled={pending} aria-expanded={confirming} aria-controls={`${id}-confirm`} onClick={() => { setConfirming(!confirming); setError(""); }}>Delete post</button>
      </div>
      {confirming && (
        <div id={`${id}-confirm`} className={styles.confirmation}>
          <p>Delete “{title}” and all its comments? This cannot be undone. Stored photos will be kept.</p>
          <div className={styles.controlActions}>
            <button type="button" disabled={pending} onClick={remove}>{pending ? "Deleting…" : "Delete permanently"}</button>
            <button type="button" disabled={pending} onClick={() => { setConfirming(false); setError(""); deleteButton.current?.focus(); }}>Cancel deletion</button>
          </div>
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
