/** Run a workbook macro against the app's active sheet (one undo step). */
import { getDisplay, getRaw, getRangeValues, getValue, setCell } from "../../engine/sheet";
import { runMacro, type MacroHost, type RunResult } from "../../macros/lua";
import type { App } from "../appTypes";

/** Run macro `id` of `app` against its active sheet; all writes form one undo step. */
export function runAppMacro(app: App, id: string): RunResult {
  const code = app.macros.get(id)?.code ?? "";
  let result: RunResult = { ok: true, output: [] };
  app.batch((sheet) => {
    const host: MacroHost = {
      getValue: (r) => getValue(sheet, r),
      getDisplay: (r) => getDisplay(sheet, r),
      getRaw: (r) => getRaw(sheet, r),
      getRangeValues: (r) => getRangeValues(sheet, r),
      setCell: (r, raw) => setCell(sheet, r, raw),
      selection: () => app.selection(),
      select: (r) => app.select(r),
      sheetName: () => app.sheetName(),
    };
    result = runMacro(code, host);
  });
  return result;
}
