// URLSearchParams has already decoded the query value. Allow only a single
// plain post identifier: no URL normalization, escaping, or second decoding.
export function getNextPostPath(value: string | null): string {
  const match = value?.match(/^\/posts\/([A-Za-z0-9_-]{1,128})(?:#comment-form)?$/);
  // Require the entire value, including rejecting a trailing newline (which $ allows).
  if (!match || match[0] !== value) return "/posts";
  if (match[1] === "new" || match[1] === "manage") return "/posts";
  return value;
}
