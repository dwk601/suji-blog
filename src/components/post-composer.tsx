"use client";

import { useRouter } from "next/navigation";
import { Editor } from "@/components/editor";
import { PhotoPicker } from "@/components/photos";
import { PostForm } from "@/components/post-form";
import type { PostEditorData } from "@/lib/posts";

export function PostComposer({ initialPost }: { initialPost?: PostEditorData }) {
  const { bfcacheId } = useRouter();
  return (
    <PostForm
      key={`${initialPost?.id ?? "new"}:${bfcacheId}`}
      initialPost={initialPost}
      renderEditor={(props) => (
        <Editor
          {...props}
          renderPhotoPicker={({ insertImage }) => (
            <PhotoPicker onSelect={insertImage} />
          )}
        />
      )}
    />
  );
}
