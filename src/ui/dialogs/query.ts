/**
 * Transformations rejouables (palette « Transformations… ») : liste d'étapes visibles
 * (filtrer, scinder, dédoublonner, pivoter) appliquée à la feuille active (1re ligne = en-têtes).
 * Les étapes sont mémorisées (localStorage); « Appliquer » crée la feuille « Requête » liée à la source
 * (rejeu automatique à chaque modification, `appLive.ts`), « Macro Lua » convertit la suite en macro.
 */
import { openDialog } from "./dialog";
import { gridOf, cellsOf } from "./pivot";
import { runQuery, stepLabel, type Step, type FilterOp } from "../../engine/query";
import { queryToLua } from "../../engine/queryLua";
import { saveLive } from "../appLive";
import { makeKey } from "../../engine/address";
import type { App } from "../appTypes";
import "./dataDialogs.css";

const KEY = "dk-table.query";

/** Étapes mémorisées (vides si absentes ou illisibles). */
function load(): Step[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Step[]; } catch { return []; }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const opts = (l: string[]) => l.map((n) => `<option>${esc(n)}</option>`).join("");

/** Ouvre le dialogue des transformations. */
export function openQuery(app: App): void {
  const grid = gridOf(app.activeDoc().cells);
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-data";
  if (grid.length < 2) {
    body.textContent = "Aucune donnée : il faut des en-têtes en ligne 1 et au moins une ligne.";
    openDialog("query", "Transformations", body);
    return;
  }
  const heads = grid[0];
  let steps = load();
  body.innerHTML = `
<ol class="dk-query__steps" aria-label="Étapes"></ol>
<label class="dk-data__field">Étape<select name="kind"><option value="filter">Filtrer</option><option value="split">Scinder</option><option value="dedupe">Dédoublonner</option><option value="pivot">Pivoter (somme)</option></select></label>
<label class="dk-data__field">Colonne<select name="col">${opts(heads)}</select></label>
<label class="dk-data__field">Condition<select name="op"><option>=</option><option>!=</option><option>&gt;</option><option>&lt;</option><option>contient</option></select></label>
<label class="dk-data__field">Valeur<input name="value" placeholder="valeur, séparateur ou colonne à sommer" autocomplete="off" spellcheck="false"></label>
<p class="dk-data__msg" role="status"></p>
<button type="button" class="dk-dialog__btn" data-action="add">Ajouter l'étape</button>
<button type="button" class="dk-dialog__btn" data-action="clear">Vider</button>
<button type="button" class="dk-dialog__btn" data-action="apply">Appliquer</button>
<button type="button" class="dk-dialog__btn" data-action="lua">Macro Lua</button>`;
  const f = (n: string) => body.querySelector<HTMLSelectElement & HTMLInputElement>(`[name="${n}"]`)!;
  const msg = body.querySelector(".dk-data__msg")!;
  const list = body.querySelector(".dk-query__steps")!;
  const on = (a: string, fn: () => void) => body.querySelector(`[data-action="${a}"]`)!.addEventListener("click", fn);
  const draw = () => {
    localStorage.setItem(KEY, JSON.stringify(steps));
    list.innerHTML = steps.map((s) => `<li>${esc(stepLabel(s))}</li>`).join("") || "<li>(aucune étape)</li>";
  };
  const make = (): Step => {
    const col = f("col").value, v = f("value").value;
    switch (f("kind").value) {
      case "filter": return { kind: "filter", col, op: f("op").value as FilterOp, value: v };
      case "split": return { kind: "split", col, delim: v || "," };
      case "dedupe": return { kind: "dedupe" };
      default: return { kind: "pivot", spec: { row: col, value: v || heads[heads.length - 1], agg: "SUM" } };
    }
  };
  on("add", () => { steps = [...steps, make()]; draw(); });
  on("clear", () => { steps = []; draw(); });
  on("apply", () => {
    const out = runQuery(grid, steps);
    if (!steps.length || !out.length) { msg.textContent = "Aucune étape, ou colonne inconnue."; return; }
    const src = app.sheets().find((s) => s.id === app.activeDoc().id)?.name ?? "";
    const names = new Set(app.sheets().map((s) => s.name));
    let dst = "Requête", n = 2;
    while (names.has(dst)) dst = `Requête ${n++}`;
    saveLive({ src, dst, steps });
    app.importSheet(dst, { cols: Math.max(26, out[0].length), rows: Math.max(100, out.length), cells: cellsOf(out) });
    box.querySelector<HTMLButtonElement>('[data-action="close"]')!.click();
  });
  on("lua", () => {
    const m = app.macros.create();
    app.macros.update(m.id, { name: "Requête", code: queryToLua(steps, `A1:${makeKey(heads.length, grid.length)}`) });
    msg.textContent = "Macro « Requête » créée (Alt+F11).";
  });
  draw();
  const box = openDialog("query", "Transformations", body);
}
