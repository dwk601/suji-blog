// URLSearchParams has already decoded the query value. Allow only a single
// plain post identifier: no URL normalization, escaping, or second decoding.
export function getNextPostPath(value: string | null): string {
  if (!value || !/^\/posts\/[A-Za-z0-9_-]{1,128}$/.test(value)) {
    return "/posts";
  }

  if (value === "/posts/new" || value === "/posts/manage") return "/posts";
  return value;
}
