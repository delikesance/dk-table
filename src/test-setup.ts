/** Vitest setup: jsdom has no layout, CodeMirror measures text with client rects; give it empty ones. */
if (typeof Range !== "undefined") {
  const rect = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
  Object.assign(Range.prototype, { getClientRects: () => [], getBoundingClientRect: () => rect });
}
