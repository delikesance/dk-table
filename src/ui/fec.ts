/** "Insérer les en-têtes FEC" (menu Données): writes the 18 FEC column names in A1:R1 of the active sheet. */
import { fecHeaderCells } from "../io/fec";
import { showToast } from "./toast/toast";
import type { App } from "./appTypes";

/** Writes the FEC headers in one undo step; refuses (toast) when any of A1:R1 is not empty. */
export function insertFecHeaders(app: App): void {
  const head = fecHeaderCells();
  const cells = app.activeDoc().cells;
  if (Object.keys(head).some((k) => (cells[k]?.raw ?? "") !== "")) {
    showToast({ message: "La ligne 1 n'est pas vide" });
    return;
  }
  app.editMany(Object.fromEntries(Object.entries(head).map(([k, c]) => [k, c.raw])));
}
