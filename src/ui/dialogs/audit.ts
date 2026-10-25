/**
 * Panneau « Audit de modèle » : constats de `engine/model/audit` (constantes codées en dur, formules incohérentes,
 * plages qui ratent une ligne, fonctions volatiles, cycles), groupés par type. Un clic va à la cellule.
 */
import { openDialog } from "./dialog";
import { auditModel, type Finding, type FindingKind } from "../../engine/model/audit";
import type { App } from "../appTypes";
import "./dataDialogs.css";

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const TITLE: Record<FindingKind, string> = {
  cycle: "Références circulaires", inconsistent: "Formules incohérentes", range: "Plages qui ratent une ligne",
  constant: "Constantes codées en dur", volatile: "Fonctions volatiles",
};

/** Remplit `el` avec les constats groupés par type; `go` reçoit le constat cliqué. */
export function renderAudit(el: HTMLElement, findings: Finding[], go: (f: Finding) => void): void {
  if (!findings.length) { el.innerHTML = '<p class="dk-data__msg">Aucun problème détecté.</p>'; return; }
  const kinds = [...new Set(findings.map((f) => f.kind))];
  el.innerHTML = kinds.map((k) => {
    const items = findings.map((f, i) => ({ f, i })).filter((x) => x.f.kind === k).map(({ f, i }) =>
      `<li><button type="button" class="dk-audit__link" data-finding="${i}" data-kind="${k}">${esc(f.sheet)}!${f.key}</button> <span class="dk-audit__msg">${esc(f.message)}</span></li>`);
    return `<h3 class="dk-diff__sheet">${TITLE[k]} (${items.length})</h3><ul class="dk-dep__list">${items.join("")}</ul>`;
  }).join("");
  el.querySelectorAll<HTMLElement>("[data-finding]").forEach((b) =>
    b.addEventListener("click", () => go(findings[Number(b.dataset.finding)])));
}

/** Ouvre le panneau d'audit du classeur (une seule instance). */
export function openAudit(app: App): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-data";
  body.innerHTML = '<div class="dk-audit"></div>';
  const box = openDialog("audit", "Audit de modèle", body);
  renderAudit(body.querySelector<HTMLElement>(".dk-audit")!, auditModel(app.toDoc()), (f) => {
    app.switchSheet(f.sheetId);
    app.select(f.key);
    box.querySelector<HTMLElement>('[data-action="close"]')!.click();
  });
}
