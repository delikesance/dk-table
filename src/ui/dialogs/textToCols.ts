/**
 * Données > Texte en colonnes : découpe la colonne sélectionnée selon des délimiteurs
 * (virgule, point-virgule, tabulation, espace, autre) vers les colonnes de droite, en un pas d'annulation.
 * Calcul dans `engine/textsplit.ts` ; ici : lecture de la sélection, dialogue, écriture via `app.editMany`.
 */
import { splitColumn, type SplitOpts } from "../../engine/textsplit";
import { parseKey } from "../../engine/address";
import { openDialog } from "./dialog";
import type { App } from "../appTypes";

/** Délimiteurs proposés : nom du champ, libellé, caractère (virgule cochée par défaut). */
const CHOICES: [string, string, string][] = [
  ["comma", "Virgule", ","], ["semi", "Point-virgule", ";"], ["tab", "Tabulation", "\t"], ["space", "Espace", " "],
];

/** Découpe la 1re colonne de la sélection ; faux (sans écriture) si rien à découper. */
export function applyTextToColumns(app: App, o: SplitOpts): boolean {
  const keys = app.selectedKeys();
  const first = Math.min(...keys.map((k) => parseKey(k)?.col ?? Infinity));
  const raw = app.activeDoc().cells;
  const src: Record<string, string> = {};
  for (const k of keys) if (parseKey(k)?.col === first && raw[k]?.raw) src[k] = raw[k].raw;
  const { cells, cols } = splitColumn(src, o);
  if (cols === 0) return false;
  app.editMany(cells);
  return true;
}

/** Ouvre la boîte « Texte en colonnes » (une seule instance). */
export function openTextToColumns(app: App): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body";
  body.innerHTML = CHOICES.map(([n, l]) => `<label class="dk-dialog__check"><input type="checkbox" name="${n}"${n === "comma" ? " checked" : ""}> ${l}</label>`).join("") +
    '<label class="dk-dialog__check"><input type="checkbox" name="merge"> Fusionner les délimiteurs consécutifs</label>' +
    '<label class="dk-dialog__check">Autre : <input type="text" name="other" size="4" maxlength="8"></label>' +
    '<button type="button" class="dk-dialog__btn" data-action="apply">Appliquer</button>';
  const box = openDialog("text-to-columns", "Texte en colonnes", body);
  const on = (n: string): boolean => body.querySelector<HTMLInputElement>(`input[name="${n}"]`)!.checked;
  body.querySelector('[data-action="apply"]')!.addEventListener("click", () => {
    const other = body.querySelector<HTMLInputElement>('input[name="other"]')!.value;
    applyTextToColumns(app, { delims: CHOICES.filter(([n]) => on(n)).map(([, , c]) => c), other, merge: on("merge") });
    box.querySelector<HTMLElement>('[data-action="close"]')!.click();
  });
}
