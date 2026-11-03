/** Body of a linked block: a table, labelled bars, or a trend curve, drawn from `RangeData`. */
import { sparklineSvg, trendHtml } from "../engine/live";
import { chartData, tableCells, type BlockAttrs, type RangeData, type TCell } from "./blocks";

/** Element with a class and text. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Column letters for a headerless range ("A", "B", ...). */
export const colName = (d: RangeData, a: BlockAttrs, i: number): string => (a.header && d.rows[0]?.[i]) || String.fromCharCode(65 + (i % 26));

/** True for cells that look like numbers, amounts or percentages (right-aligned). */
const numeric = (t: string): boolean => /^[-+\d\s.,%€$  ]+$/.test(t) && /\d/.test(t);

/** Table of the chosen columns, header row first when `a.header`. */
function table(d: RangeData, a: BlockAttrs): HTMLElement {
  const v = tableCells(d, a), t = el("table", "dk-block__table");
  const span = (e: HTMLElement, c: TCell): HTMLElement => { // merged cells of the sheet
    if (c.cs > 1) e.setAttribute("colspan", String(c.cs));
    if (c.rs > 1) e.setAttribute("rowspan", String(c.rs));
    return e;
  };
  if (v.head) {
    const tr = t.createTHead().insertRow();
    v.head.filter((h) => !h.skip).forEach((h) => tr.append(span(el("th", "", h.t), h)));
  }
  const body = t.createTBody();
  v.body.forEach((row) => {
    const tr = body.insertRow();
    row.filter((c) => !c.skip).forEach((c) => tr.append(span(el("td", numeric(c.t) ? "dk-num" : "", c.t), c)));
  });
  return t;
}

/** One horizontal bar per row: label, proportional bar, formatted value. */
function bars(d: RangeData, a: BlockAttrs): HTMLElement {
  const c = chartData(d, a), top = Math.max(...c.values.map((x) => Math.abs(x) || 0), 0) || 1;
  const box = el("div", "dk-block__bars");
  c.labels.forEach((l, i) => {
    const row = el("div", "dk-bar"), fill = el("span", Number(c.values[i]) < 0 ? "dk-bar__fill dk-bar__fill--neg" : "dk-bar__fill");
    fill.style.width = `${(Math.abs(c.values[i]) || 0) / top * 100}%`;
    const track = el("span", "dk-bar__track");
    track.append(fill);
    row.append(el("span", "dk-bar__label", l), track, el("span", "dk-bar__value", c.valueLabels[i]));
    box.append(row);
  });
  return box;
}

/** Curve of the series with the colour-coded variation first to last. */
function trend(d: RangeData, a: BlockAttrs): HTMLElement {
  const c = chartData(d, a), box = el("div", "dk-block__trend");
  const svg = el("span", "dk-trend__curve");
  svg.innerHTML = sparklineSvg(c.values, { width: 360, height: 56 });
  const info = el("span", "dk-trend__info");
  info.innerHTML = trendHtml(c.values);
  box.append(svg, info, el("span", "dk-trend__name", c.valueName));
  return box;
}

/** Draw the block body for `a.kind`. */
export function renderBody(d: RangeData, a: BlockAttrs): HTMLElement {
  return a.kind === "bar" ? bars(d, a) : a.kind === "trend" ? trend(d, a) : table(d, a);
}
