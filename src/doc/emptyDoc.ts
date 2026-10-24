/** JSON of a new empty document (one empty paragraph); a fresh object per call. Kept free of ProseMirror so the app shell stays light. */
export function emptyDoc(): { type: "doc"; content: unknown[] } {
  return { type: "doc", content: [{ type: "paragraph" }] };
}
