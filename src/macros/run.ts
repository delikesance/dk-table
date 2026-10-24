/** Lance une macro Lua sur la feuille active de l'app (un seul pas d'annulation). */
import type { App } from "../ui/appTypes";
import { runMacro, sheetApi, type MacroResult } from "./macro";

/** Exécute `code` sur la feuille active (écritures = une seule entrée d'undo); `run` injectable pour les tests. */
export function runMacroOnApp(app: App, code: string, run: typeof runMacro = runMacro): Promise<MacroResult> {
  return app.runBatch((sheet) => run(code, sheetApi(sheet)));
}
