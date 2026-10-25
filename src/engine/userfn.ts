/** Fonctions nommées : registre (`userfnStore.ts`) + recalcul d'une feuille après changement de définitions. */
import type { Sheet } from "./types";
import { rewire } from "./recalc";
import { recalcBook } from "./workbook";

export * from "./userfnStore";

/** Recalcule toutes les formules de la feuille (après `setUserFunctions`). */
export function recalcAll(sheet: Sheet): void {
  for (const [k, c] of Object.entries(sheet.cells)) {
    if (!c.raw.startsWith("=")) continue;
    rewire(sheet, k);
    recalcBook(sheet, k);
  }
}
