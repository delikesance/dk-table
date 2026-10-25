/**
 * Tableau croisé (palette « Tableau croisé… ») : lit la feuille active (1re ligne = en-têtes),
 * propose une disposition par défaut (1re colonne texte en lignes, 1re numérique en valeur, SUM)
 * et crée une nouvelle feuille « Croisé » via `engine/pivot`.
 */
import { openDialog } from "./dialog";
import { pivot, defaultSpec, type PivotAgg } from "../../engine/pivot";
import { makeKey, parseKey } from "../../engine/address";
import type { App } from "../appTypes";
import "./dataDialogs.css";

/** Nom du champ calculé saisi dans le dialogue. */
const CALC_NAME = "Calcul";

/** Table de chaînes (zone utilisée à partir de A1) d'une feuille persistée. */
export function gridOf(cells: Record<string, { raw: string }>): string[][] {
  let rows = 0, cols = 0;
  const at: [number, number, string][] = [];
  for (const [k, c] of Object.entries(cells)) {
    const p = parseKey(k);
    if (!p || c.raw === "") continue;
    rows = Math.max(rows, p.row); cols = Math.max(cols, p.col); at.push([p.row, p.col, c.raw]);
  }
  const g = Array.from({ length: rows }, () => Array<string>(cols).fill(""));
  for (const [r, c, v] of at) g[r - 1][c - 1] = v;
  return g;
}

/** Cellules persistables (clés A1) d'une grille de chaînes; les vides sont omises. */
export function cellsOf(g: string[][]): Record<string, { raw: string }> {
  const out: Record<string, { raw: string }> = {};
  g.forEach((row, r) => row.forEach((v, c) => { if (v !== "") out[makeKey(c + 1, r + 1)] = { raw: v }; }));
  return out;
}

const opts = (names: string[]): string => names.map((n) => `<option>${n.replace(/</g, "&lt;")}</option>`).join("");

/** Ouvre le dialogue; « Créer » ajoute la feuille et ferme. */
export function openPivot(app: App): void {
  const grid = gridOf(app.activeDoc().cells);
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-data";
  const spec = grid.length > 1 ? defaultSpec(grid) : undefined;
  if (!spec) {
    body.textContent = "Aucune donnée exploitable : il faut des en-têtes en ligne 1, une colonne de texte et une colonne de nombres.";
    openDialog("pivot", "Tableau croisé", body);
    return;
  }
  const heads = grid[0];
  body.innerHTML = `
<label class="dk-data__field">Lignes<select name="row">${opts(heads)}</select></label>
<label class="dk-data__field">Colonnes<select name="col"><option value="">(aucune)</option>${opts(heads)}</select></label>
<label class="dk-data__field">Valeur<select name="value">${opts(heads)}</select></label>
<label class="dk-data__field">Agrégation<select name="agg"><option>SUM</option><option>COUNT</option><option>AVG</option></select></label>
<label class="dk-data__field">Champ calculé<input name="calc" placeholder="ex. Qte*Prix" autocomplete="off" spellcheck="false"></label>
<p class="dk-data__msg" role="status"></p>
<button type="button" class="dk-dialog__btn" data-action="create">Créer</button>`;
  const f = (n: string) => body.querySelector<HTMLSelectElement & HTMLInputElement>(`[name="${n}"]`)!;
  f("row").value = spec.row; f("value").value = spec.value;
  body.querySelector<HTMLButtonElement>('[data-action="create"]')!.addEventListener("click", () => {
    const expr = f("calc").value.trim();
    const out = pivot(grid, {
      row: f("row").value, col: f("col").value || undefined, agg: f("agg").value as PivotAgg,
      value: expr ? CALC_NAME : f("value").value, calc: expr ? { name: CALC_NAME, expr } : undefined,
    });
    if (!out.length) { body.querySelector(".dk-data__msg")!.textContent = "Champ inconnu ou expression invalide."; return; }
    app.importSheet("Croisé", { cols: Math.max(26, out[0].length), rows: Math.max(100, out.length), cells: cellsOf(out) });
    box.querySelector<HTMLButtonElement>('[data-action="close"]')!.click();
  });
  const box = openDialog("pivot", "Tableau croisé", body);
}
