import { type NodeViewRenderer } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";

export function isSafeLink(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048 || /[\s\u0000-\u001f\u007f\\]/.test(value)) return false;
  if (!/^(https?:\/\/|mailto:)/i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "mailto:"
      ? Boolean(url.pathname)
      : Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isPhotoKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_./-]{0,511}$/.test(value)
    && value.split("/").every((part) => part !== ".." && part !== "." && part !== "");
}

const PostImage = Image.extend({
  addAttributes() {
    return {
      key: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-photo-key"),
        renderHTML: (attributes) => ({ "data-photo-key": attributes.key }),
      },
      alt: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "img[data-photo-key]", getAttrs: (element) => isPhotoKey(element.getAttribute("data-photo-key")) ? null : false }];
  },
  // Only a picker can supply a storage key; pasted URLs aren't stored images.
  addInputRules() { return []; },
});

/** The schema is identical everywhere; only the editable image view is optional. */
export function createPostExtensions({ imageNodeView }: { imageNodeView?: NodeViewRenderer } = {}) {
  return [
    StarterKit.configure({
      link: {
        openOnClick: false,
        protocols: ["http", "https", "mailto"],
        isAllowedUri: isSafeLink,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
      },
    }),
    imageNodeView ? PostImage.extend({ addNodeView() { return imageNodeView; } }) : PostImage,
  ];
}
