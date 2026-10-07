import "server-only";

import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { createPostExtensions, validatePostContent, type JSONContent } from "@/lib/post-content";
import { publicUrl } from "@/lib/r2";
import styles from "./post-content.module.css";

export function PostContent({ content }: { content: JSONContent }) {
  const validated = validatePostContent(content);
  return (
    <div className={styles.content}>
      {renderToReactElement({
        content: validated,
        extensions: createPostExtensions(),
        options: {
          nodeMapping: {
            image: ({ node }) => (
              // Stored photos need no optimization proxy or editor JavaScript.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicUrl(node.attrs.key)} alt={node.attrs.alt} loading="lazy" decoding="async" />
            ),
          },
          markMapping: {
            link: ({ mark, children }) => <a href={mark.attrs.href} target="_blank" rel="noopener noreferrer nofollow">{children}</a>,
          },
        },
      })}
    </div>
  );
}
