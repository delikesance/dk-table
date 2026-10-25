/** "Ajuster à la largeur du contenu": sets the widths of columns to their widest displayed text (saved in the document, one undo step). */
import { getDisplay, getRaw } from "../engine/sheet";
import { fitColumn, withDomMeasure, type FitText } from "./grid/fit";
import { colName, keyOf } from "./grid/keys";
import { viewOf } from "./appGrid";
import { formatValue } from "./numfmt";
import { setTitle, type Ctx } from "./appState";
import { pushUndo } from "./model";

/** Fit each column of `cols` to its content (filled cells only, number formats and bold taken into account). */
export function fitColumns(c: Ctx, cols: number[]): void {
  const { sheet, styles } = c.cur;
  const view = viewOf(c.cur);
  pushUndo(c.cur);
  withDomMeasure(c.gridHost, (measure) => {
    for (const col of cols) {
      const texts: FitText[] = [];
      for (let r = 0; r < sheet.rows; r++) {
        const k = keyOf(col, r);
        if (getRaw(sheet, k) === "") continue;
        texts.push({ text: formatValue(getDisplay(sheet, k), styles[k]?.format), bold: !!styles[k]?.bold });
      }
      view.widths[col] = fitColumn(colName(col), texts, measure);
    }
  });
  c.grid.relayout();
  setTitle(c, true);
}
