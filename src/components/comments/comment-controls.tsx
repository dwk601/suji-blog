"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const editButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const restoreEditFocus = useRef(false);

  useEffect(() => {
    // The edit button is disabled until the closed form has committed.
    if (!editing && restoreEditFocus.current) {
      restoreEditFocus.current = false;
      editButton.current?.focus();
    }
  }, [editing]);
  useEffect(() => { if (error && !pending) errorRef.current?.focus(); }, [error, pending]);

  function closeEdit(wasSaved: boolean) {
    restoreEditFocus.current = true;
    setEditing(false);
    setSaved(wasSaved);
  }

  function remove() {
    if (pending) return;
    // Keep a stable focus target: successful deletion unmounts these controls.
    const heading = deleteButton.current?.closest('section[aria-label="Comments"]')?.querySelector("h2");
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteAction({ postId, commentId });
        if (!result.ok) setError(result.error);
        else heading?.focus();
      } catch { setError("Couldn't confirm deletion. Check your connection and try again."); }
    });
  }

  return (
    <div className={styles.controls} aria-busy={pending}>
      <div className={styles.actions}>
        <button type="button" ref={editButton} disabled={pending || editing} aria-expanded={editing} onClick={() => { setEditing(true); setConfirming(false); setError(""); setSaved(false); }}>Edit comment</button>
        <button type="button" ref={deleteButton} disabled={pending || editing} aria-expanded={confirming} onClick={() => { setConfirming(!confirming); setError(""); setSaved(false); }}>Delete comment</button>
      </div>
      {editing && <CommentForm postId={postId} commentId={commentId} initialBody={body} submitAction={updateAction} onSaved={() => closeEdit(true)} onCancel={() => closeEdit(false)} />}
      {confirming && <div className={styles.confirmation}>
        <p>Delete this comment? This cannot be undone.</p>
        <div className={styles.actions}>
          <button type="button" disabled={pending} onClick={remove}>{pending ? "Deleting…" : "Delete permanently"}</button>
          <button type="button" disabled={pending} onClick={() => { setConfirming(false); setError(""); deleteButton.current?.focus(); }}>Cancel deletion</button>
        </div>
        {error && <p className={styles.error} role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
      </div>}
      {saved && <p className={styles.hint} role="status">Comment saved.</p>}
    </div>
  );
}
