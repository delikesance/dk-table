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
export function renderAudit(el: HTMLElement, findings: Finding[], go: (f: Finding) => void, fix?: (f: Finding) => void): void {
  if (!findings.length) { el.innerHTML = '<p class="dk-data__msg">Aucun problème détecté.</p>'; return; }
  const kinds = [...new Set(findings.map((f) => f.kind))];
  el.innerHTML = kinds.map((k) => {
    const items = findings.map((f, i) => ({ f, i })).filter((x) => x.f.kind === k).map(({ f, i }) =>
      `<li><button type="button" class="dk-audit__link" data-finding="${i}" data-kind="${k}">${esc(f.sheet)}!${f.key}</button> <span class="dk-audit__msg">${esc(f.message)}</span>${f.fix ? ` <button type="button" class="dk-audit__fix" data-fix="${i}">${esc(f.fix.label)}</button>` : ""}</li>`);
    return `<h3 class="dk-diff__sheet">${TITLE[k]} (${items.length})</h3><ul class="dk-dep__list">${items.join("")}</ul>`;
  }).join("");
  el.querySelectorAll<HTMLElement>("[data-finding]").forEach((b) =>
    b.addEventListener("click", () => go(findings[Number(b.dataset.finding)])));
  el.querySelectorAll<HTMLElement>("[data-fix]").forEach((b) =>
    b.addEventListener("click", () => fix?.(findings[Number(b.dataset.fix)])));
}

/** Ouvre le panneau d'audit du classeur (une seule instance). */
export function openAudit(app: App): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-data";
  body.innerHTML = '<div class="dk-audit"></div>';
  const box = openDialog("audit", "Audit de modèle", body);
  const el = body.querySelector<HTMLElement>(".dk-audit")!;
  const go = (f: Finding): void => {
    app.switchSheet(f.sheetId);
    app.select(f.key);
    box.querySelector<HTMLElement>('[data-action="close"]')!.click();
  };
  /** Applique la correction (un pas d'annulation par feuille) puis relance l'audit. */
  const fix = (f: Finding): void => {
    const cur = app.toDoc().sheets.find((s) => s.id === f.sheetId);
    if (!f.fix || !cur) return;
    app.switchSheet(f.sheetId);
    app.editMany(Object.fromEntries(f.fix.edits.filter((e) => e.sheetId === f.sheetId).map((e) => [e.key, e.raw])));
    renderAudit(el, auditModel(app.toDoc()), go, fix);
  };
  renderAudit(el, auditModel(app.toDoc()), go, fix);
}
