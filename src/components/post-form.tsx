"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { EMPTY_POST_CONTENT, type JSONContent, type PhotoUrls } from "@/lib/post-content";
import { savePost, type PostEditorData } from "@/lib/posts";
import styles from "./post-form.module.css";

export type PostFormProps = {
  initialPost?: PostEditorData;
  uploadPending: boolean;
  renderEditor: (props: { value: JSONContent; onChange: (content: JSONContent) => void; disabled: boolean; photoUrls: PhotoUrls }) => ReactNode;
};

export function PostForm({ initialPost, uploadPending, renderEditor }: PostFormProps) {
  const id = useId();
  const router = useRouter();
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [content, setContent] = useState<JSONContent>(initialPost?.content ?? EMPTY_POST_CONTENT);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const savingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  useEffect(() => {
    const form = formRef.current;
    const actions = actionRef.current;
    if (!form || !actions) return;
    const viewport = window.visualViewport;
    const toolbar = form.querySelector<HTMLElement>('[aria-label="Text formatting"]');
    let frame = 0;

    function keepFocusVisible() {
      if (!form || !actions) return;
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || !form.contains(focused) || actions.contains(focused)) return;
      let rect = focused.getBoundingClientRect();
      if (focused.isContentEditable) {
        const selection = window.getSelection();
        if (!selection?.rangeCount || !focused.contains(selection.anchorNode)) return;
        rect = selection.getRangeAt(0).getBoundingClientRect();
        if (!rect.height) return;
      } else if (!focused.matches("input, textarea, select")) return;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const actionRect = actions.getBoundingClientRect();
      const bottom = Math.min(viewportBottom, actionRect.top) - 16;
      const toolbarRect = toolbar?.getBoundingClientRect();
      const toolbarIsPinned = toolbar && toolbarRect && getComputedStyle(toolbar).position === "sticky"
        && toolbarRect.top <= viewportTop + 1 && toolbarRect.bottom > viewportTop;
      const top = toolbarIsPinned ? toolbarRect.bottom + 16 : viewportTop + 16;
      if (bottom - top < rect.height) return;
      if (rect.bottom > bottom) window.scrollBy(0, rect.bottom - bottom);
      else if (rect.top < top) window.scrollBy(0, rect.top - top);
    }

    function scheduleFocusCheck() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(keepFocusVisible);
    }

    function updateViewport() {
      if (!form || !actions) return;
      const height = viewport?.height ?? window.innerHeight;
      const actionHeight = actions.getBoundingClientRect().height;
      const toolbarHeight = toolbar?.getBoundingClientRect().height ?? 0;
      const keyboardInset = Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0));
      form.style.setProperty("--composer-keyboard-inset", `${keyboardInset}px`);
      form.style.setProperty("--composer-actions-height", `${actionHeight}px`);
      form.dataset.shortViewport = String(height < actionHeight + toolbarHeight + 96);
      form.dataset.tinyViewport = String(height < actionHeight + 96);
      scheduleFocusCheck();
    }

    const observer = new ResizeObserver(updateViewport);
    observer.observe(actions);
    if (toolbar) observer.observe(toolbar);
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    form.addEventListener("focusin", scheduleFocusCheck);
    document.addEventListener("selectionchange", scheduleFocusCheck);
    updateViewport();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      form.removeEventListener("focusin", scheduleFocusCheck);
      document.removeEventListener("selectionchange", scheduleFocusCheck);
    };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadPending || savingRef.current || pending || saved) return;
    savingRef.current = true;
    setError("");
    startTransition(async () => {
      try {
        // ProseMirror attributes have a null prototype. Cross the Server Action
        // boundary with plain JSON objects, not React temporary references.
        const result = await savePost({ ...(initialPost ? { id: initialPost.id } : {}), title, content: JSON.parse(JSON.stringify(content)) });
        if (!result.ok) {
          savingRef.current = false;
          setError(result.error);
          return;
        }
        setSaved(true);
        router.push(`/posts/${result.id}`);
      } catch {
        savingRef.current = false;
        setError("Couldn't reach the server. Your changes are still here; try saving again.");
      }
    });
  }

  return (
    <form ref={formRef} className={styles.form} onSubmit={submit} aria-busy={pending}>
      <fieldset disabled={pending || saved} className={styles.fields}>
        <div className={styles.titleField}>
          <label htmlFor={`${id}-title`}>Post title</label>
          <input id={`${id}-title`} name="title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} autoComplete="off" />
        </div>
        <div className={styles.bodyField}>
          <p className={styles.label}>Post content</p>
          {renderEditor({ value: content, onChange: setContent, disabled: pending || saved, photoUrls: initialPost?.photoUrls ?? {} })}
        </div>
      </fieldset>
      <div ref={actionRef} className={styles.actionArea}>
        {error && <p ref={errorRef} role="alert" tabIndex={-1} className={styles.error}>{error}</p>}
        <div className={styles.actionRow}>
          <div className={styles.actions}>
            <button type="submit" className={styles.save} disabled={uploadPending || pending || saved} aria-describedby={`${id}-save-notice ${id}-save-status`}>{pending ? "Saving…" : initialPost ? "Save changes" : "Save post"}</button>
            <Link href={initialPost ? `/posts/${initialPost.id}` : "/posts/manage"} aria-disabled={pending || saved} tabIndex={pending || saved ? -1 : undefined} onClick={(event) => { if (pending || saved) event.preventDefault(); }}>Cancel</Link>
          </div>
          <p id={`${id}-save-notice`} className={styles.notice}>Saving makes this post public immediately.</p>
        </div>
        <p id={`${id}-save-status`} role="status" className={styles.notice}>{uploadPending ? "Wait for your photo to finish uploading and inserting before saving." : saved ? "Saved. Opening your public post…" : ""}</p>
      </div>
    </form>
  );
}
