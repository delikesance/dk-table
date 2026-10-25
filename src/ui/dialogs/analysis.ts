/**
 * Dialogue « Outils d'analyse… » (palette Données) : choix de l'outil (`engine/analysis`), de la
 * plage d'entrée, des options propres à l'outil, puis création d'une feuille « Analyse » avec les
 * résultats. Erreur de plage ou de calcul = message dans le dialogue, aucune écriture.
 */
import { openDialog } from "./dialog";
import { gridOf } from "./pivot";
import { ANALYSIS_TOOLS, analysisInput, outputSheet, runAnalysis, type AnalysisTool } from "../../engine/analysis";
import { colToLetters } from "../../engine/range";
import type { App } from "../appTypes";
import "./dataDialogs.css";

/** Nom de la feuille créée par défaut. */
const SHEET_NAME = "Analyse";

const opts = (): string => ANALYSIS_TOOLS.map((t) => `<option value="${t.id}">${t.label}</option>`).join("");

/** Plage par défaut : de A1 à la cellule utilisée la plus éloignée (A1 si la feuille est vide). */
function defaultRange(grid: string[][]): string {
  const cols = Math.max(1, ...grid.map((row) => row.length));
  return `A1:${colToLetters(cols)}${Math.max(1, grid.length)}`;
}

/** Ouvre le dialogue ; « Créer » ajoute la feuille d'analyse et ferme. */
export function openAnalysis(app: App): void {
  const grid = gridOf(app.activeDoc().cells);
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-data";
  body.innerHTML = `
<label class="dk-data__field">Outil<select name="tool">${opts()}</select></label>
<label class="dk-data__field">Plage d'entrée<input name="range" value="${defaultRange(grid)}" autocomplete="off" spellcheck="false"></label>
<label class="dk-data__field"><span><input name="headers" type="checkbox" checked> La première ligne contient les en-têtes</span></label>
<div class="dk-data__regress" hidden>
<label class="dk-data__field">Colonne X (n°)<input name="x" type="number" min="1" value="1"></label>
<label class="dk-data__field">Colonne Y (n°)<input name="y" type="number" min="1" value="2"></label>
</div>
<label class="dk-data__field">Feuille de sortie<input name="name" value="${SHEET_NAME}" autocomplete="off"></label>
<p class="dk-data__msg" role="status"></p>
<button type="button" class="dk-dialog__btn" data-action="run">Créer</button>`;
  const f = <T extends HTMLElement>(n: string) => body.querySelector<T>(`[name="${n}"]`)!;
  const tool = f<HTMLSelectElement>("tool");
  const regress = body.querySelector<HTMLElement>(".dk-data__regress")!;
  tool.addEventListener("change", () => { regress.hidden = tool.value !== "regression"; });
  const say = (text: string) => { body.querySelector(".dk-data__msg")!.textContent = text; };
  body.querySelector<HTMLButtonElement>('[data-action="run"]')!.addEventListener("click", () => {
    const input = analysisInput(grid, f<HTMLInputElement>("range").value);
    if (!input.ok) { say(input.message); return; }
    const headers = f<HTMLInputElement>("headers").checked;
    const x = Number(f<HTMLInputElement>("x").value) || undefined;
    const y = Number(f<HTMLInputElement>("y").value) || undefined;
    const out = runAnalysis(tool.value as AnalysisTool, input.grid, { headers, x, y });
    if (!out.ok) { say(out.message); return; }
    const sheet = outputSheet(out.table);
    app.importSheet(f<HTMLInputElement>("name").value.trim() || SHEET_NAME, sheet);
    box.querySelector<HTMLButtonElement>('[data-action="close"]')!.click();
  });
  const box = openDialog("analysis", "Outils d'analyse", body);
}
