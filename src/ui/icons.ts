/**
 * Single source of UI icons: Iconoir (npm `iconoir`, regular set) as inline SVG.
 * Strokes are `currentColor`; the colour is black in light mode and light in dark
 * mode via `--c-icon` (see `.dk-icon` in src/styles/components.css).
 */
import undo from "iconoir/icons/regular/undo.svg?raw";
import redo from "iconoir/icons/regular/redo.svg?raw";
import bold from "iconoir/icons/regular/bold.svg?raw";
import italic from "iconoir/icons/regular/italic.svg?raw";
import alignLeft from "iconoir/icons/regular/align-left.svg?raw";
import alignCenter from "iconoir/icons/regular/align-center.svg?raw";
import alignRight from "iconoir/icons/regular/align-right.svg?raw";
import fill from "iconoir/icons/regular/fill-color.svg?raw";
import open from "iconoir/icons/regular/folder.svg?raw";
import save from "iconoir/icons/regular/floppy-disk.svg?raw";
import plus from "iconoir/icons/regular/plus.svg?raw";
import chevronRight from "iconoir/icons/regular/nav-arrow-right.svg?raw";
import file from "iconoir/icons/regular/page.svg?raw";
import tools from "iconoir/icons/regular/nav-arrow-down.svg?raw";

import percent from "iconoir/icons/regular/percentage.svg?raw";
import sum from "iconoir/icons/regular/sigma-function.svg?raw";
import textColor from "iconoir/icons/regular/text-size.svg?raw";
import sortAsc from "iconoir/icons/regular/sort-up.svg?raw";
import sortDesc from "iconoir/icons/regular/sort-down.svg?raw";
import add from "iconoir/icons/regular/page-plus.svg?raw";
import upload from "iconoir/icons/regular/upload.svg?raw";
import download from "iconoir/icons/regular/download.svg?raw";

import filter from "iconoir/icons/regular/filter-list.svg?raw";
import underline from "iconoir/icons/regular/underline.svg?raw";
import wrap from "iconoir/icons/regular/wrap-text.svg?raw";
import borders from "iconoir/icons/regular/border-out.svg?raw";
import bordersAll from "iconoir/icons/regular/table.svg?raw";
import bordersBottom from "iconoir/icons/regular/border-bottom.svg?raw";
import bordersNone from "iconoir/icons/regular/square-dashed.svg?raw";
import merge from "iconoir/icons/regular/horizontal-merge.svg?raw";
import arrowUp from "iconoir/icons/regular/arrow-up.svg?raw";
import arrowDown from "iconoir/icons/regular/arrow-down.svg?raw";
import edit from "iconoir/icons/regular/edit-pencil.svg?raw";
import play from "iconoir/icons/regular/play.svg?raw";
import trash from "iconoir/icons/regular/trash.svg?raw";

const RAW: Record<string, string> = {
  "sort-asc": sortAsc, "sort-desc": sortDesc, percent, sum, "text-color": textColor, add, upload, download, undo, redo, bold, italic, fill, open, save, tools, plus, file,
  chevron: tools, "chevron-right": chevronRight,
  "align-left": alignLeft, "align-center": alignCenter, "align-right": alignRight,
  filter, underline, wrap, merge, borders, "borders-all": bordersAll, "borders-bottom": bordersBottom, "borders-none": bordersNone,
  "arrow-up": arrowUp, "arrow-down": arrowDown, edit, trash, play,
};

/** Names accepted by {@link icon}. */
export const ICON_NAMES = Object.keys(RAW);

/** Returns the inline `<svg class="dk-icon">` for `name` (empty string if unknown); size/colour come from CSS. */
export function icon(name: string): string {
  const raw = RAW[name];
  if (!raw) return "";
  return raw.trim()
    .replace(/\s(width|height)="\d+"/g, "")
    .replace("<svg", '<svg class="dk-icon" aria-hidden="true"');
}
