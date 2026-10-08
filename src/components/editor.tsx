"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { NodeSelection, type SelectionBookmark } from "@tiptap/pm/state";
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, useEditorState, type NodeViewProps } from "@tiptap/react";
import { createPostExtensions, isPhotoKey, isSafeLink, type InsertImage, type JSONContent, type PhotoUrls } from "@/lib/post-content";
import contentStyles from "./post-content.module.css";
import styles from "./editor.module.css";

const ImageUrls = createContext<PhotoUrls>({});

function EditorImage({ node, selected, editor, updateAttributes, deleteNode, getPos }: NodeViewProps) {
  const id = useId();
  const urls = useContext(ImageUrls);
  const url = urls[node.attrs.key];
  return (
    <NodeViewWrapper className={styles.image} data-photo-key={node.attrs.key}>
      {url ? (
        // Storage URLs are resolved separately, never written into document JSON.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={node.attrs.alt} draggable="true" data-drag-handle />
      ) : <span>Photo preview unavailable. Select this photo to edit or remove it.</span>}
      {selected && (
        <div className={styles.fields} contentEditable={false} data-photo-controls>
          <label htmlFor={`${id}-alt`}>Photo description (alt text)</label>
          <div className={styles.fieldRow}>
            <input id={`${id}-alt`} value={node.attrs.alt ?? ""} disabled={!editor.isEditable} maxLength={1000} aria-describedby={`${id}-alt-hint`} onChange={(event) => updateAttributes({ alt: event.target.value })} onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape") {
                event.preventDefault();
                editor.commands.focus();
              }
            }} />
            <button type="button" disabled={!editor.isEditable} onClick={() => {
              const position = getPos();
              deleteNode();
              editor.commands.focus(position);
            }}>Remove photo</button>
          </div>
          <p id={`${id}-alt-hint`}>Describe what matters in this image. Leave blank only if it is decorative.</p>
        </div>
      )}
    </NodeViewWrapper>
  );
}

export type EditorProps = {
  value: JSONContent;
  onChange: (value: JSONContent) => void;
  photoUrls?: PhotoUrls;
  disabled?: boolean;
  renderPhotoPicker?: (props: { insertImage: (image: InsertImage) => boolean }) => ReactNode;
};

export function Editor({ value, onChange, photoUrls = {}, disabled = false, renderPhotoPicker }: EditorProps) {
  const id = useId();
  const [insertedUrls, setInsertedUrls] = useState<PhotoUrls>({});
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const photoSelection = useRef<SelectionBookmark | null>(null);
  const extensions = useMemo(() => createPostExtensions({ imageNodeView: ReactNodeViewRenderer(EditorImage) }), []);
  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      attributes: { role: "textbox", "aria-label": "Post content", "aria-multiline": "true" },
      handleDOMEvents: {
        pointerdown(view, event) {
          if (!view.editable || event.button !== 0 || !(event.target instanceof HTMLElement)) return false;
          const image = event.target.closest("[data-photo-key]");
          if (!image || event.target.closest("[data-photo-controls]")) return false;
          // Handle selection in the editor's native event layer, not a React
          // portal that can be replaced as the editor receives focus.
          const position = view.posAtDOM(image, 0);
          view.focus();
          view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, position)).setMeta("pointer", true));
          // Keep native mouse/drag handling and keyboard selection unchanged.
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    onTransaction: ({ transaction }) => {
      // An upload may finish after more typing. Track the original insertion
      // point through those edits instead of inserting at an unrelated caret.
      if (photoSelection.current) photoSelection.current = photoSelection.current.map(transaction.mapping);
    },
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) => editor ? {
      bold: editor.isActive("bold"), italic: editor.isActive("italic"), underline: editor.isActive("underline"), strike: editor.isActive("strike"),
      heading2: editor.isActive("heading", { level: 2 }), heading3: editor.isActive("heading", { level: 3 }),
      bulletList: editor.isActive("bulletList"), orderedList: editor.isActive("orderedList"),
      blockquote: editor.isActive("blockquote"), codeBlock: editor.isActive("codeBlock"), code: editor.isActive("code"),
      link: editor.isActive("link"),
      undo: editor.can().undo(), redo: editor.can().redo(),
    } : null,
  });

  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const viewport = window.visualViewport;
    const form = toolbar.closest("form");
    function updateClearance() {
      if (!toolbar) return;
      const toolbarHeight = toolbar.offsetHeight;
      const bottomHeight = form?.querySelector<HTMLElement>("[data-composer-actions]")?.offsetHeight ?? 0;
      const availableHeight = viewport?.height ?? window.innerHeight;
      const release = availableHeight < toolbarHeight + bottomHeight + 96;
      toolbar.dataset.static = String(release);
      // A mobile keyboard can pan the visual viewport below the layout
      // viewport's top, where `top: 0` would hide the toolbar.
      toolbar.style.top = `${viewport?.offsetTop ?? 0}px`;
      toolbar.parentElement?.style.setProperty("--editor-toolbar-clearance", release ? "1rem" : `${toolbarHeight + 16}px`);
      editor?.view.setProps({ scrollMargin: { top: release ? 16 : toolbarHeight + 16, bottom: bottomHeight + 16, left: 16, right: 16 } });
    }
    const observer = new ResizeObserver(updateClearance);
    observer.observe(toolbar);
    if (form) observer.observe(form);
    updateClearance();
    viewport?.addEventListener("resize", updateClearance);
    viewport?.addEventListener("scroll", updateClearance);
    window.addEventListener("resize", updateClearance);
    return () => {
      observer.disconnect();
      viewport?.removeEventListener("resize", updateClearance);
      viewport?.removeEventListener("scroll", updateClearance);
      window.removeEventListener("resize", updateClearance);
    };
  }, [editor]);

  const insertImage = useCallback((image: InsertImage) => {
    if (!editor || disabled) return false;
    if (!isPhotoKey(image.key) || typeof image.alt !== "string" || image.alt.length > 1000 || !/^https?:\/\//i.test(image.url)) {
      setError("This photo couldn't be inserted. Select a stored photo and try again.");
      return false;
    }
    setInsertedUrls((urls) => ({ ...urls, [image.key]: image.url }));
    const selection = photoSelection.current?.resolve(editor.state.doc) ?? editor.state.selection;
    photoSelection.current = null;
    editor.chain().command(({ tr }) => { tr.setSelection(selection); return true; }).insertContent({ type: "image", attrs: { key: image.key, alt: image.alt } }).focus().scrollIntoView().run();
    setError("");
    return true;
  }, [editor, disabled]);

  function applyLink() {
    if (!editor) return;
    const href = link.trim();
    if (!isSafeLink(href)) {
      setError("Enter a complete https://, http:// or mailto: address.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setError("");
    setLinkOpen(false);
  }

  const controls = editor && state ? [
    { label: "Bold", active: state.bold, run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", active: state.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Underline", active: state.underline, run: () => editor.chain().focus().toggleUnderline().run() },
    { label: "Strikethrough", active: state.strike, run: () => editor.chain().focus().toggleStrike().run() },
    { label: "Heading 2", active: state.heading2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", active: state.heading3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Bullet list", active: state.bulletList, run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", active: state.orderedList, run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Quote", active: state.blockquote, run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Inline code", active: state.code, run: () => editor.chain().focus().toggleCode().run() },
    { label: "Code block", active: state.codeBlock, run: () => editor.chain().focus().toggleCodeBlock().run() },
  ] : [];

  return (
    <div className={styles.editor}>
      <div ref={toolbarRef} className={styles.toolbar} data-editor-toolbar>
        <div className={styles.formatting} role="group" aria-label="Text formatting">
          {controls.map(({ label, active, run }) => <button key={label} type="button" aria-pressed={active} disabled={disabled} onClick={run}>{label}</button>)}
          <button type="button" disabled={!editor || disabled} aria-expanded={linkOpen} aria-controls={`${id}-link-panel`} onClick={() => {
            setLink(editor?.getAttributes("link").href ?? "");
            setError("");
            setLinkOpen(!linkOpen);
          }}>Link</button>
          <button type="button" disabled={disabled || !state?.link} onClick={() => { editor?.chain().focus().extendMarkRange("link").unsetLink().run(); setLinkOpen(false); }}>Remove link</button>
          <button type="button" disabled={disabled || !state?.undo} onClick={() => editor?.chain().focus().undo().run()}>Undo</button>
          <button type="button" disabled={disabled || !state?.redo} onClick={() => editor?.chain().focus().redo().run()}>Redo</button>
        </div>
        {linkOpen && (
          <div className={styles.fields} id={`${id}-link-panel`}>
            <label htmlFor={`${id}-link`}>Link address</label>
            <div className={styles.fieldRow}>
              <input id={`${id}-link`} value={link} disabled={disabled} maxLength={2048} placeholder="https://example.com" autoFocus aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => setLink(event.target.value)} onKeyDown={(event) => {
                if (event.key === "Enter") { event.preventDefault(); applyLink(); }
                if (event.key === "Escape") { event.preventDefault(); setLinkOpen(false); editor?.commands.focus(); }
              }} />
              <button type="button" disabled={disabled} onClick={applyLink}>Apply link</button>
              <button type="button" onClick={() => { setLinkOpen(false); setError(""); editor?.commands.focus(); }}>Cancel</button>
            </div>
          </div>
        )}
        {error && <p className={styles.error} id={`${id}-error`} role="alert">{error}</p>}
      </div>
      {editor && !disabled && renderPhotoPicker && <div className={styles.picker} onPointerDownCapture={(event) => {
        if (!event.currentTarget.contains(document.activeElement)) photoSelection.current = editor.state.selection.getBookmark();
      }} onFocusCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) photoSelection.current = editor.state.selection.getBookmark();
      }}>
        {/* eslint-disable-next-line react-hooks/refs -- The render prop builds UI; insertion only runs from picker events, never during render. */}
        {renderPhotoPicker({ insertImage })}
      </div>}
      {!editor && <p className={styles.loading} role="status">Loading editor…</p>}
      <ImageUrls.Provider value={{ ...photoUrls, ...insertedUrls }}>
        <EditorContent editor={editor} className={`${styles.editable} ${contentStyles.content}`} />
      </ImageUrls.Provider>
      <p className={styles.hint}>Select text to format it. Select a photo to change its description or remove it.</p>
    </div>
  );
}
