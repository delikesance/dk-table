/**
 * Validation glue: marks cells breaking a rule (`data-inv`) and, after a bulk write (paste, fill,
 * open/import), toasts the count with a « Voir » button opening the validation dialog.
 */
import { getRaw } from "../engine/sheet";
import { invalidCells } from "../engine/validation/check";
import type { Invalid } from "../engine/validation/types";
import { showToast } from "./toast/toast";
import { openValidationDialog } from "./validation/panel";
import type { Ctx } from "./appState";

/** Cells of the active sheet that break its rules. */
export function invalidOf(c: Ctx): Invalid[] {
  const s = c.cur.sheet;
  return c.cur.validation.length ? invalidCells(c.cur.validation, (k) => getRaw(s, k), s.cols, s.rows) : [];
}

/** Recompute the invalid set and (re)mark the rendered cells; returns the invalid cells. */
export function markInvalid(c: Ctx): Invalid[] {
  const bad = invalidOf(c);
  c.invalid = new Set(bad.map((b) => b.key));
  for (const el of c.gridHost.querySelectorAll<HTMLElement>(".dkg-cell[data-key]")) {
    if (c.invalid.has(el.dataset.key!)) el.dataset.inv = ""; else delete el.dataset.inv;
  }
  return bad;
}

/** After a bulk write: mark, then toast « N cellules invalides » with « Voir » when there are any. */
export function notifyInvalid(c: Ctx): void {
  const n = markInvalid(c).length;
  if (!n) return;
  showToast({
    message: `${n} cellule${n > 1 ? "s" : ""} invalide${n > 1 ? "s" : ""} (règle de validation)`,
    actionLabel: "Voir", duration: 8000, onAction: () => openValidationDialog(c.app),
  });
}
