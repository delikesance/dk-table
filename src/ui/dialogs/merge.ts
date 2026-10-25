/**
 * Fusionner… (menu Données, palette) : le classeur ouvert est « nôtre » ; on choisit la version de base
 * et l'autre version (.dktable). Aperçu en lecture seule de la fusion à 3 voies (`io/mergeDocs`) :
 * nombre de conflits puis, par feuille, base / nôtre / leur / résultat des cellules touchées.
 */
import { openDialog } from "./dialog";
import { mergeDocs } from "../../io/mergeDocs";
import { parse } from "../../io/format";
import { diffCells } from "../../io/diff";
import type { DktDoc } from "../../io/types";
import type { App } from "../appTypes";
import "./dataDialogs.css";

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const raws = (d: DktDoc, i: number): Record<string, string> =>
  Object.fromEntries(Object.entries(d.sheets[i]?.cells ?? {}).map(([k, c]) => [k, c.raw]));
const plural = (n: number): string => (n ? `${n} conflit${n > 1 ? "s" : ""}` : "Aucun conflit");

/** Remplit `el` avec l'aperçu de la fusion de `ours` et `theirs` sur `base`. */
export function renderMerge(el: HTMLElement, base: DktDoc, ours: DktDoc, theirs: DktDoc): void {
  const sheets = mergeDocs(base, ours, theirs);
  const total = sheets.reduce((n, s) => n + s.conflicts.length, 0);
  const rows = (i: number): string => {
    const s = sheets[i], b = Object.fromEntries(base.sheets.filter((x) => x.id === s.id || x.name === s.name).flatMap((x) => Object.entries(x.cells).map(([k, c]) => [k, c.raw])));
    const t = Object.fromEntries(theirs.sheets.filter((x) => x.id === s.id || x.name === s.name).flatMap((x) => Object.entries(x.cells).map(([k, c]) => [k, c.raw])));
    const o = raws(ours, i), bad = new Map(s.conflicts.map((c) => [c.key, c]));
    const keys = new Set([...diffCells(b, o), ...diffCells(b, t)].map((c) => c.key));
    return [...keys].sort((a, z) => a.length - z.length || (a < z ? -1 : 1)).map((k) =>
      `<tr class="${bad.has(k) ? "dk-merge--conflict" : ""}"><td>${k}</td><td>${esc(b[k] ?? "")}</td><td>${esc(o[k] ?? "")}</td><td>${esc(t[k] ?? "")}</td><td>${esc(s.merged[k] ?? "")}</td></tr>`).join("");
  };
  el.innerHTML = `<p class="dk-merge__count" role="status">${plural(total)}</p>${sheets.map((s, i) => `<h3 class="dk-diff__sheet">${esc(s.name)}</h3>
<table class="dk-diff__table"><thead><tr><th>Cellule</th><th>Base</th><th>Nôtre</th><th>Leur</th><th>Résultat</th></tr></thead><tbody>${rows(i)}</tbody></table>`).join("")}`;
}

/** Ouvre le dialogue : deux fichiers (base, autre version) puis aperçu. */
export function openMerge(app: App): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-data";
  body.innerHTML = '<label>Version de base <input type="file" accept=".dktable,application/json" data-role="base" aria-label="Version de base"></label><label>Autre version <input type="file" accept=".dktable,application/json" data-role="theirs" aria-label="Autre version"></label><div class="dk-diff" role="status"></div>';
  const out = body.querySelector<HTMLElement>(".dk-diff")!;
  const docs: { base?: DktDoc; theirs?: DktDoc } = {};
  const pick = (role: "base" | "theirs"): void => {
    body.querySelector<HTMLInputElement>(`[data-role="${role}"]`)!.addEventListener("change", async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try { docs[role] = parse(await file.text()); } catch { out.textContent = "Fichier illisible."; return; }
      if (docs.base && docs.theirs) renderMerge(out, docs.base, app.toDoc(), docs.theirs);
    });
  };
  pick("base"); pick("theirs");
  openDialog("merge", "Fusionner", body);
}
