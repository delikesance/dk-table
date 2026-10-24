/**
 * F4 reference cycling (pure text transform, used by the cell editor and the formula bar):
 * the A1-style reference under or just left of the caret goes A1 -> $A$1 -> A$1 -> $A1 -> A1.
 */

/** A1-style reference not glued to a name/number (so LOG10 or SUM( never match). */
const REF = /(?<![A-Za-z0-9_.$])(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![A-Za-z0-9_(])/g;

/** Next [colAbs, rowAbs] in the F4 cycle. */
function next(col: boolean, row: boolean): [boolean, boolean] {
  if (!col && !row) return [true, true];
  if (col && row) return [false, true];
  if (!col) return [true, false];
  return [false, false];
}

/**
 * Cycle the reference containing the caret (or ending right at it).
 * Returns the new text and a caret placed right after the reference; unchanged when no reference.
 */
export function cycleRef(text: string, caret: number): { text: string; caret: number } {
  for (const m of text.matchAll(REF)) {
    const start = m.index!, end = start + m[0].length;
    if (caret < start || caret > end) continue;
    const [c, r] = next(m[1] === "$", m[3] === "$");
    const ref = `${c ? "$" : ""}${m[2]}${r ? "$" : ""}${m[4]}`;
    return { text: text.slice(0, start) + ref + text.slice(end), caret: start + ref.length };
  }
  return { text, caret };
}

/** Apply F4 to a text field in place (value + caret). */
export function cycleRefIn(el: HTMLInputElement | HTMLTextAreaElement): void {
  const r = cycleRef(el.value, el.selectionStart ?? el.value.length);
  el.value = r.text;
  el.setSelectionRange(r.caret, r.caret);
}
