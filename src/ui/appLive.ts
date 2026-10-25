/**
 * Requêtes vivantes : chaque requête (feuille source -> feuille résultat + étapes) est rejouée
 * à chaque modification du classeur, sans réapplication manuelle. Persistées (localStorage, par noms de feuilles).
 */
import { tableOf, replayInto, type Step } from "../engine/query";
import type { Ctx } from "./appState";

/** Requête liée : lit la feuille `src`, écrit la feuille `dst`. */
export interface LiveQuery { src: string; dst: string; steps: Step[] }

const KEY = "dk-table.livequery";
let busy = false;

/** Requêtes enregistrées (vides si absentes ou illisibles). */
export function liveQueries(): LiveQuery[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as LiveQuery[]; } catch { return []; }
}

/** Enregistre (ou remplace, par feuille résultat) une requête vivante. */
export function saveLive(q: LiveQuery): void {
  localStorage.setItem(KEY, JSON.stringify([...liveQueries().filter((x) => x.dst !== q.dst), q]));
}

/** Rejoue toutes les requêtes dont les deux feuilles existent; ré-affiche la grille si le résultat est visible. */
export function runLive(c: Ctx): void {
  if (busy) return;
  busy = true;
  try {
    for (const q of liveQueries()) {
      const src = c.entries.find((e) => e.name === q.src), dst = c.entries.find((e) => e.name === q.dst);
      if (!src || !dst || src === dst) continue;
      replayInto(dst.sheet, tableOf(src.sheet.cells), q.steps);
      if (c.cur === dst) c.grid?.refresh();
    }
  } finally { busy = false; }
}
