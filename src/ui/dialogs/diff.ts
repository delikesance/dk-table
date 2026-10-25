/**
 * Comparer (palette « Comparer avec un fichier… ») : choisit un `.dktable`, affiche les
 * différences cellule par cellule avec le classeur ouvert (`io/diff`). Lecture seule.
 */
import { openDialog } from "./dialog";
import { diffDocs } from "../../io/diff";
import { parse } from "../../io/format";
import type { DktDoc } from "../../io/types";
import type { App } from "../appTypes";
import "./dataDialogs.css";

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const STATUS = { added: "feuille ajoutée", removed: "feuille supprimée", changed: "", same: "" };

/** Remplit `el` avec les différences de `a` (ouvert) vers `b` (fichier choisi). */
export function renderDiff(el: HTMLElement, a: DktDoc, b: DktDoc): void {
  const diffs = diffDocs(a, b).filter((d) => d.status !== "same");
  if (!diffs.length) { el.textContent = "Aucune différence."; return; }
  el.innerHTML = diffs.map((d) => `<h3 class="dk-diff__sheet">${esc(d.name)} ${STATUS[d.status]}</h3>
<table class="dk-diff__table"><thead><tr><th>Cellule</th><th>Ouvert</th><th>Fichier</th></tr></thead><tbody>${
    d.changes.map((c) => `<tr class="dk-diff--${c.kind}"><td>${c.key}</td><td>${esc(c.from)}</td><td>${esc(c.to)}</td></tr>`).join("")
  }</tbody></table>`).join("");
}

/** Ouvre le dialogue : choix du fichier puis liste des différences. */
export function openCompare(app: App): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-data";
  body.innerHTML = '<input type="file" accept=".dktable,application/json" aria-label="Fichier .dktable"><div class="dk-diff" role="status"></div>';
  const out = body.querySelector<HTMLElement>(".dk-diff")!;
  body.querySelector<HTMLInputElement>('input[type="file"]')!.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try { renderDiff(out, app.toDoc(), parse(await file.text())); }
    catch { out.textContent = "Fichier illisible."; }
  });
  openDialog("compare", "Comparer", body);
}
