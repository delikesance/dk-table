/** Public types of the grid component. */

/** Options for createGrid. */
export interface GridOptions {
  cols: number;
  rows: number;
  /** Text shown in a cell (formula result). */
  getDisplay(key: string): string;
  /** Raw content (formula text) used for editing and copy. */
  getRaw(key: string): string;
  /** Called when the user commits a value (edit, paste, delete). */
  onEdit(key: string, raw: string): void;
  /** Called on selection change with "A1" or "A1:B3". */
  onSelect?(sel: string): void;
  /** Hook: return an element to render instead of text (e.g. mini-charts), or null. */
  renderCell?(key: string): HTMLElement | null;
}

/** Public grid API. */
export interface Grid {
  /** Re-render the given cells (all when omitted). */
  refresh(keys?: string[]): void;
  /** Select a single cell by key. */
  select(key: string): void;
  /** Current selection: "A1" or "A1:B3". */
  getSelection(): string;
}
