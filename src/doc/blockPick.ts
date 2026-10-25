/** Cell selection inside a linked table: drag over cells, then offer "Citer la sélection" / "Nouveau bloc lié". */
import { keyOf, parseKey } from "../ui/grid/keys";
import type { BlockAttrs } from "./blocks";

/** Position of a rendered cell in the sheet: row/col of the linked range's origin plus its offsets. */
function sheetPos(a: BlockAttrs, td: HTMLTableCellElement): { col: number; row: number } {
  const o = parseKey(a.ref.split(":")[0]), tr = td.parentElement as HTMLTableRowElement;
  const inHead = tr.parentElement!.tagName === "THEAD";
  const r = inHead ? 0 : tr.sectionRowIndex + (a.header ? 1 : 0);
  const c = a.cols ? a.cols[td.cellIndex] : td.cellIndex;
  return { col: o.col + c, row: o.row + r };
}

/**
 * Make the tables inside `dom` selectable by dragging; the result bar `.dk-block__pick` shows the
 * sheet range and calls `act` with "cite" or "block" and that range ("A3:D4").
 */
export function bindPick(dom: HTMLElement, attrs: () => BlockAttrs, act: (kind: "cite" | "block", ref: string) => void): void {
  let from: HTMLTableCellElement | null = null, to: HTMLTableCellElement | null = null;
  const clear = (): void => {
    dom.querySelector(".dk-block__pick")?.remove();
    dom.querySelectorAll(".dk-cell--pick").forEach((e) => e.classList.remove("dk-cell--pick"));
  };
  const cellOf = (e: Event): HTMLTableCellElement | null => (e.target as HTMLElement).closest("td, th");
  dom.addEventListener("mousedown", (e) => { clear(); from = to = cellOf(e); });
  dom.addEventListener("mouseover", (e) => { if (from) to = cellOf(e) ?? to; });
  dom.addEventListener("mouseup", () => {
    if (!from || !to) return;
    const a = attrs(), p = sheetPos(a, from), q = sheetPos(a, to);
    from = to = null;
    const single = p.col === q.col && p.row === q.row;
    if (single) return;
    const ref = `${keyOf(Math.min(p.col, q.col), Math.min(p.row, q.row))}:${keyOf(Math.max(p.col, q.col), Math.max(p.row, q.row))}`;
    const bar = document.createElement("div");
    bar.className = "dk-block__pick";
    const btn = (label: string, kind: "cite" | "block", act2: string): void => {
      const b = document.createElement("button");
      b.textContent = label; b.dataset.act = act2; b.className = "dk-block__btn";
      b.onclick = () => act(kind, ref);
      bar.append(b);
    };
    btn(`Citer la sélection · ${ref}`, "cite", "cite");
    btn("Nouveau bloc lié", "block", "newblock");
    dom.append(bar);
  });
}
