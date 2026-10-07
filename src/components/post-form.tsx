"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { EMPTY_POST_CONTENT, type JSONContent, type PhotoUrls } from "@/lib/post-content";
import { savePost, type PostEditorData } from "@/lib/posts";
import styles from "./post-form.module.css";

export type PostFormProps = {
  initialPost?: PostEditorData;
  renderEditor: (props: { value: JSONContent; onChange: (content: JSONContent) => void; disabled: boolean; photoUrls: PhotoUrls }) => ReactNode;
};

export function PostForm({ initialPost, renderEditor }: PostFormProps) {
  const id = useId();
  const router = useRouter();
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [content, setContent] = useState<JSONContent>(initialPost?.content ?? EMPTY_POST_CONTENT);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || saved) return;
    setError("");
    startTransition(async () => {
      try {
        // ProseMirror attributes have a null prototype. Cross the Server Action
        // boundary with plain JSON objects, not React temporary references.
        const result = await savePost({ ...(initialPost ? { id: initialPost.id } : {}), title, content: JSON.parse(JSON.stringify(content)) });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSaved(true);
        router.push(`/posts/${result.id}`);
      } catch {
        setError("Couldn't reach the server. Your changes are still here; try saving again.");
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-busy={pending}>
      <fieldset disabled={pending || saved} className={styles.fields}>
        <div className={styles.titleField}>
          <label htmlFor={`${id}-title`}>Post title</label>
          <input id={`${id}-title`} name="title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} autoComplete="off" />
        </div>
        <div className={styles.bodyField}>
          <p className={styles.label}>Post content</p>
          {renderEditor({ value: content, onChange: setContent, disabled: pending || saved, photoUrls: initialPost?.photoUrls ?? {} })}
        </div>
        <p className={styles.notice}>Saving makes this post public immediately.</p>
        <div className={styles.actions}>
          <button type="submit" className={styles.save}>{pending ? "Saving…" : initialPost ? "Save changes" : "Save post"}</button>
          <Link href={initialPost ? `/posts/${initialPost.id}` : "/posts/manage"} aria-disabled={pending || saved} tabIndex={pending || saved ? -1 : undefined} onClick={(event) => { if (pending || saved) event.preventDefault(); }}>Cancel</Link>
        </div>
      </fieldset>
      {error && <p ref={errorRef} role="alert" tabIndex={-1} className={styles.error}>{error}</p>}
      {saved && <p role="status" className={styles.notice}>Saved. Opening your public post…</p>}
    </form>
  );
}
