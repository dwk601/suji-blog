"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Editor } from "@/components/editor";
import { PhotoPicker } from "@/components/photos";
import { PostForm } from "@/components/post-form";
import type { PostEditorData } from "@/lib/posts";

export function PostComposer({ initialPost }: { initialPost?: PostEditorData }) {
  const { bfcacheId } = useRouter();
  return <ComposerSession key={`${initialPost?.id ?? "new"}:${bfcacheId}`} initialPost={initialPost} />;
}

function ComposerSession({ initialPost }: { initialPost?: PostEditorData }) {
  const [uploadPending, setUploadPending] = useState(false);
  return (
    <PostForm
      initialPost={initialPost}
      uploadPending={uploadPending}
      renderEditor={(props) => (
        <Editor
          {...props}
          renderPhotoPicker={({ insertImage }) => (
            <PhotoPicker {...{ onSelect: insertImage, onUploadPendingChange: setUploadPending }} />
          )}
        />
      )}
    />
  );
}
