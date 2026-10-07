import { getSchema, type JSONContent } from "@tiptap/core";
import { createPostExtensions, isPhotoKey, isSafeLink } from "./extensions";

export { createPostExtensions, isPhotoKey, isSafeLink } from "./extensions";
export type { JSONContent } from "@tiptap/core";

export const EMPTY_POST_CONTENT: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
export type InsertImage = { key: string; alt: string; url: string };
export type PhotoUrls = Record<string, string>;

const schema = getSchema(createPostExtensions());

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(): never {
  throw new Error("Invalid post content. Use the editor's supported formatting and safe links.");
}

function checkAttributes(type: string, value: unknown, defaults: Record<string, unknown>) {
  if (value === undefined) value = {};
  if (!record(value) || Object.keys(value).some((key) => !Object.hasOwn(defaults, key))) fail();
  const attrs = { ...defaults, ...value };
  if (type === "image" && (!isPhotoKey(attrs.key) || typeof attrs.alt !== "string" || attrs.alt.length > 1000)) fail();
  if (type === "link") {
    if (!isSafeLink(attrs.href)) throw new Error("Links must be complete http, https or mailto addresses.");
    if (attrs.target !== null && attrs.target !== "_blank" && attrs.target !== "_self") fail();
    if (attrs.rel !== null && (typeof attrs.rel !== "string" || attrs.rel.length > 100)) fail();
    if (attrs.class !== null) fail();
    if (attrs.title !== null && (typeof attrs.title !== "string" || attrs.title.length > 1000)) fail();
  }
  if (type === "heading" && (!Number.isInteger(attrs.level) || Number(attrs.level) < 1 || Number(attrs.level) > 6)) fail();
  if (type === "orderedList" && (!Number.isInteger(attrs.start) || Number(attrs.start) < 1 || Number(attrs.start) > 1_000_000 || ![null, "1", "a", "A", "i", "I"].includes(attrs.type as string | null))) fail();
  if (type === "codeBlock" && attrs.language !== null && (typeof attrs.language !== "string" || !/^[a-zA-Z0-9_+-]{1,64}$/.test(attrs.language))) fail();
}

/** Validate untrusted input before persistence AND rendering, against the editor schema. */
export function validatePostContent(value: unknown): JSONContent {
  let size: number;
  try { size = JSON.stringify(value)?.length ?? 0; } catch { fail(); }
  if (size === 0 || size > 500_000) throw new Error("Post content is too large or invalid (maximum 500,000 characters).");
  let count = 0;
  function checkNode(node: unknown, depth: number) {
    if (++count > 10_000 || depth > 32 || !record(node) || typeof node.type !== "string") fail();
    if (Object.keys(node).some((key) => !["type", "attrs", "content", "marks", "text"].includes(key))) fail();
    if (!Object.hasOwn(schema.nodes, node.type)) fail();
    const nodeType = schema.nodes[node.type];
    checkAttributes(node.type, node.attrs, nodeType.spec.attrs ? Object.fromEntries(Object.entries(nodeType.spec.attrs).map(([name, attr]) => [name, attr.default])) : {});
    if (node.type === "text") {
      if (typeof node.text !== "string" || !node.text.length || node.content !== undefined) fail();
    } else if (node.text !== undefined) fail();
    if (node.marks !== undefined) {
      if (!Array.isArray(node.marks)) fail();
      const marks = new Set<string>();
      for (const mark of node.marks) {
        if (!record(mark) || typeof mark.type !== "string" || Object.keys(mark).some((key) => key !== "type" && key !== "attrs")) fail();
        if (!Object.hasOwn(schema.marks, mark.type) || marks.has(mark.type)) fail();
        const markType = schema.marks[mark.type];
        marks.add(mark.type);
        checkAttributes(mark.type, mark.attrs, markType.spec.attrs ? Object.fromEntries(Object.entries(markType.spec.attrs).map(([name, attr]) => [name, attr.default])) : {});
      }
    }
    if (node.content !== undefined) {
      if (!Array.isArray(node.content)) fail();
      node.content.forEach((child) => checkNode(child, depth + 1));
    }
  }
  checkNode(value, 0);
  if (!record(value) || value.type !== "doc") fail();
  try {
    const document = schema.nodeFromJSON(value);
    document.check();
    return document.toJSON();
  } catch { fail(); }
}

/** Call with validated content; storage callers also verify these keys exist. */
export function getPostPhotoKeys(content: JSONContent): string[] {
  const keys = new Set<string>();
  function visit(node: JSONContent) {
    if (node.type === "image" && isPhotoKey(node.attrs?.key)) keys.add(node.attrs.key);
    node.content?.forEach(visit);
  }
  visit(content);
  return [...keys];
}
