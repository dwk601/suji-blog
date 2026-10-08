"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import type { CommentResult, CommentWriteInput } from "@/lib/comments";
import styles from "./comments.module.css";

export function CommentForm({ postId, commentId, initialBody = "", submitAction, onSaved, onCancel }: {
  postId: string;
  commentId?: string;
  initialBody?: string;
  submitAction: (input: CommentWriteInput) => Promise<CommentResult>;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setSuccess(false);
    startTransition(async () => {
      try {
        const result = await submitAction({ postId, body, ...(commentId ? { commentId } : {}) });
        if (!result.ok) { setError(result.error); return; }
        if (!commentId) { setBody(""); setSuccess(true); }
        onSaved?.();
      } catch { setError("Couldn't reach the server. Your text is still here; try again."); }
    });
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-busy={pending}>
      <label htmlFor={`${id}-body`}>{commentId ? "Edit comment" : "Leave a comment"}</label>
      <textarea id={`${id}-body`} name="body" value={body} onChange={(event) => { setBody(event.target.value); setSuccess(false); }} required maxLength={5000} rows={4} disabled={pending} autoFocus={Boolean(commentId)} aria-invalid={Boolean(error)} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} />
      <p id={`${id}-hint`} className={styles.hint}>Up to 5,000 characters. Comments appear publicly as plain text.</p>
      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={pending}>{pending ? "Saving…" : commentId ? "Save comment" : "Add comment"}</button>
        {onCancel && <button type="button" disabled={pending} onClick={onCancel}>Cancel edit</button>}
      </div>
      {error && <p id={`${id}-error`} className={styles.error} role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
      {success && <p className={styles.hint} role="status">Comment added.</p>}
    </form>
  );
}
