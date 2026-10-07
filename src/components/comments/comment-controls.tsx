"use client";

import { useRef, useState, useTransition } from "react";
import type { CommentDeleteInput, CommentResult, CommentWriteInput } from "@/lib/comments";
import { CommentForm } from "./comment-form";
import styles from "./comments.module.css";

export function CommentControls({ postId, commentId, body, updateAction, deleteAction }: {
  postId: string;
  commentId: string;
  body: string;
  updateAction: (input: CommentWriteInput) => Promise<CommentResult>;
  deleteAction: (input: CommentDeleteInput) => Promise<CommentResult>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const editButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);

  function remove() {
    if (pending) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteAction({ postId, commentId });
        if (!result.ok) setError(result.error);
      } catch { setError("Couldn't confirm deletion. Check your connection and try again."); }
    });
  }

  return (
    <div className={styles.controls} aria-busy={pending}>
      <div className={styles.actions}>
        <button type="button" ref={editButton} disabled={pending || editing} aria-expanded={editing} onClick={() => { setEditing(!editing); setConfirming(false); setError(""); }}>Edit comment</button>
        <button type="button" ref={deleteButton} disabled={pending || editing} aria-expanded={confirming} onClick={() => { setConfirming(!confirming); setError(""); }}>Delete comment</button>
      </div>
      {editing && <CommentForm postId={postId} commentId={commentId} initialBody={body} submitAction={updateAction} onSaved={() => { setEditing(false); editButton.current?.focus(); }} onCancel={() => { setEditing(false); editButton.current?.focus(); }} />}
      {confirming && <div className={styles.confirmation}>
        <p>Delete this comment? This cannot be undone.</p>
        <div className={styles.actions}>
          <button type="button" disabled={pending} onClick={remove}>{pending ? "Deleting…" : "Delete permanently"}</button>
          <button type="button" disabled={pending} onClick={() => { setConfirming(false); setError(""); deleteButton.current?.focus(); }}>Cancel deletion</button>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>}
    </div>
  );
}
