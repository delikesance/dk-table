/** Inline SVG icon bodies (24x24 viewBox, stroke styled by `.dk-iconbtn svg`). */
export const ICONS: Record<string, string> = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  bold: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',
  italic: '<path d="M10 5h8M6 19h8M14 5l-4 14"/>',
  "align-left": '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
  "align-center": '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
  "align-right": '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
  fill: '<path d="m5 12 7-7 7 7-7 7z"/><path d="M19 16s2 2.2 2 3.5a2 2 0 0 1-4 0C17 18.2 19 16 19 16z"/>',
  open: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
};

/** Returns an inline `<svg>` string for the named icon. */
export function icon(name: string): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] ?? ""}</svg>`;
}
