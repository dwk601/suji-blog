"use client";

import { createContext, useContext, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { NodeSelection } from "@tiptap/pm/state";
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, useEditorState, type NodeViewProps } from "@tiptap/react";
import { createPostExtensions, isPhotoKey, isSafeLink, type InsertImage, type JSONContent, type PhotoUrls } from "@/lib/post-content";
import contentStyles from "./post-content.module.css";
import styles from "./editor.module.css";

const ImageUrls = createContext<PhotoUrls>({});

function EditorImage({ node }: NodeViewProps) {
  const urls = useContext(ImageUrls);
  const url = urls[node.attrs.key];
  return (
    <NodeViewWrapper className={styles.image} data-photo-key={node.attrs.key}>
      {url ? (
        // Storage URLs are resolved separately, never written into document JSON.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={node.attrs.alt} draggable="true" data-drag-handle />
      ) : <span>Photo preview unavailable. Select this photo to edit or remove it.</span>}
    </NodeViewWrapper>
  );
}

export type EditorProps = {
  value: JSONContent;
  onChange: (value: JSONContent) => void;
  photoUrls?: PhotoUrls;
  disabled?: boolean;
  renderPhotoPicker?: (props: { insertImage: (image: InsertImage) => void }) => ReactNode;
};

export function Editor({ value, onChange, photoUrls = {}, disabled = false, renderPhotoPicker }: EditorProps) {
  const id = useId();
  const [insertedUrls, setInsertedUrls] = useState<PhotoUrls>({});
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
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
          if (!image) return false;
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
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) => editor ? {
      bold: editor.isActive("bold"), italic: editor.isActive("italic"), underline: editor.isActive("underline"), strike: editor.isActive("strike"),
      heading2: editor.isActive("heading", { level: 2 }), heading3: editor.isActive("heading", { level: 3 }),
      bulletList: editor.isActive("bulletList"), orderedList: editor.isActive("orderedList"),
      blockquote: editor.isActive("blockquote"), codeBlock: editor.isActive("codeBlock"), code: editor.isActive("code"),
      link: editor.isActive("link"), image: editor.isActive("image"),
      imageKey: editor.getAttributes("image").key as string | undefined,
      imageAlt: (editor.getAttributes("image").alt ?? "") as string,
      undo: editor.can().undo(), redo: editor.can().redo(),
    } : null,
  });

  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);

  function insertImage(image: InsertImage) {
    if (!editor || disabled) return;
    if (!isPhotoKey(image.key) || typeof image.alt !== "string" || image.alt.length > 1000 || !/^https?:\/\//i.test(image.url)) {
      setError("This photo couldn't be inserted. Select a stored photo and try again.");
      return;
    }
    setInsertedUrls((urls) => ({ ...urls, [image.key]: image.url }));
    editor.chain().focus().insertContent({ type: "image", attrs: { key: image.key, alt: image.alt } }).run();
    setError("");
  }

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
      <div className={styles.toolbar} role="group" aria-label="Text formatting">
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
      {!editor && <p className={styles.loading} role="status">Loading editor…</p>}
      <ImageUrls.Provider value={{ ...photoUrls, ...insertedUrls }}>
        <EditorContent editor={editor} className={`${styles.editable} ${contentStyles.content}`} />
      </ImageUrls.Provider>
      {state?.image && (
        <div className={styles.fields} key={state.imageKey}>
          <label htmlFor={`${id}-alt`}>Photo description (alt text)</label>
          <div className={styles.fieldRow}>
            <input id={`${id}-alt`} value={state.imageAlt} disabled={disabled} maxLength={1000} aria-describedby={`${id}-alt-hint`} onChange={(event) => editor?.commands.updateAttributes("image", { alt: event.target.value })} />
            <button type="button" disabled={disabled} onClick={() => editor?.chain().focus().deleteSelection().run()}>Remove photo</button>
          </div>
          <p id={`${id}-alt-hint`}>Describe what matters in this image. Leave blank only if it is decorative.</p>
        </div>
      )}
      {editor && !disabled && renderPhotoPicker && <div className={styles.picker}>{renderPhotoPicker({ insertImage })}</div>}
      <p className={styles.hint}>Select text to format it. Select a photo to change its description or remove it.</p>
    </div>
  );
}
