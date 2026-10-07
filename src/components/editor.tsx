"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export function Editor({ content = "" }: { content?: string }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false,
  });

  return <EditorContent editor={editor} />;
}
