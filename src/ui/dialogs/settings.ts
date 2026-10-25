/**
 * Paramètres (Fichier > Paramètres…, Ctrl+,) : réglages persistants de l'application.
 * Aujourd'hui : afficher l'accueil au démarrage (clé `dk-table.home`, lue par main.ts).
 * Options du classeur : décimal exact (`engine/decimal.ts`), calcul manuel / itératif (`engine/calc-mode.ts`).
 * Le thème reste dans le menu Affichage (pas de doublon).
 */
import { openDialog } from "./dialog";
import { decimalMode, setDecimalMode } from "../../engine/decimal";
import { calcMode, setCalcMode } from "../../engine/calc-mode";

export const HOME_KEY = "dk-table.home";

/** Vrai si l'accueil doit s'afficher au lancement (défaut : oui). */
export function homeOnStartup(): boolean {
  try { return localStorage.getItem(HOME_KEY) !== "0"; } catch { return true; }
}

/** Ouvre la boîte Paramètres (une seule instance). */
export function openSettings(): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body";
  body.innerHTML =
    '<label class="dk-dialog__check"><input type="checkbox" name="home"> Afficher l\'accueil au démarrage</label>';
  const box = body.querySelector<HTMLInputElement>('input[name="home"]')!;
  box.checked = homeOnStartup();
  box.addEventListener("change", () => {
    try { localStorage.setItem(HOME_KEY, box.checked ? "1" : "0"); } catch { /* stockage indisponible */ }
  });
  // Option du classeur (enregistrée dans le .dktable, pas dans le stockage local)
  body.insertAdjacentHTML("beforeend",
    '<label class="dk-dialog__check"><input type="checkbox" name="decimal"> Décimal exact (mode comptable)</label>');
  const dec = body.querySelector<HTMLInputElement>('input[name="decimal"]')!;
  dec.checked = decimalMode();
  dec.addEventListener("change", () => setDecimalMode(dec.checked));
  // Calcul : manuel (F9 recalcule) et itératif (références circulaires recalculées jusqu'à convergence)
  body.insertAdjacentHTML("beforeend",
    '<label class="dk-dialog__check"><input type="checkbox" name="manual"> Calcul manuel (F9 recalcule)</label>' +
    '<label class="dk-dialog__check"><input type="checkbox" name="iterative"> Calcul itératif (références circulaires)</label>' +
    '<label class="dk-dialog__check">Itérations max <input type="number" name="maxIter" min="1" step="1"></label>' +
    '<label class="dk-dialog__check">Écart max <input type="number" name="maxChange" min="0" step="any"></label>');
  const field = (n: string) => body.querySelector<HTMLInputElement>(`input[name="${n}"]`)!;
  const mode = calcMode();
  field("manual").checked = mode.manual;
  field("iterative").checked = mode.iterative;
  field("maxIter").value = String(mode.maxIter);
  field("maxChange").value = String(mode.maxChange);
  field("manual").addEventListener("change", () => setCalcMode({ manual: field("manual").checked }));
  field("iterative").addEventListener("change", () => setCalcMode({ iterative: field("iterative").checked }));
  field("maxIter").addEventListener("change", () => setCalcMode({ maxIter: Number(field("maxIter").value) }));
  field("maxChange").addEventListener("change", () => setCalcMode({ maxChange: Number(field("maxChange").value) }));
  openDialog("settings", "Paramètres", body);
}
