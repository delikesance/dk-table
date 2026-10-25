/** Fonctions nommées de l'app : remplacement des définitions, recalcul de toutes les feuilles, état « modifié ». */
import { recalcAll, setUserFunctions, type UserFn } from "../engine/userfn";
import { touch } from "./appGrid";
import { setTitle, type Ctx } from "./appState";

/** Remplace les définitions du classeur, recalcule chaque feuille et redessine la grille. */
export function setFunctions(c: Ctx, list: UserFn[]): void {
  setUserFunctions(list);
  for (const e of c.entries) recalcAll(e.sheet);
  touch(c);
  setTitle(c, true);
}
