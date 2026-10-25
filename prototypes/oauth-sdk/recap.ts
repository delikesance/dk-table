/**
 * Récap imprimable des designs: un seul document HTML autonome, 16:9 paysage,
 * une page par section (couverture, un design par page, étapes). Prévu pour
 * l'import dans Canva via PDF (pas d'API Canva). Fonction pure, sans I/O.
 */
import type { BoucleEvent } from "./server";

/** Étape du designer; `file` est l'événement d'écriture d'un fichier de design. */
export type RecapStep = Omit<BoucleEvent, "type"> & {
  type: BoucleEvent["type"] | "file";
  state?: "ecrit" | "mis-a-jour";
  ts?: number;
};
/** Design à embarquer. */
export interface RecapDesign { name: string; html: string; mtimeMs: number }

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Corps d'un design sans script, iframe, gestionnaire d'événement ni URL javascript:. */
function sanitize(html: string): string {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  return body
    .replace(/<(script|iframe|object|embed)\b[\s\S]*?(<\/\1\s*>|$)/gi, "")
    .replace(/<\/?(html|head|body|!doctype)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

const STATE: Record<string, string> = { ecrit: "écrit", "mis-a-jour": "mis à jour" };
const fmtDate = (ms?: number): string => (ms ? new Date(ms).toLocaleString("fr-FR") : "");

/** Libellé d'une ligne de la page « Étapes du designer ». */
function stepRow(e: RecapStep): string {
  const what =
    e.type === "file" ? `Fichier ${esc(e.message ?? "")}` :
    e.type === "start" ? "Début" :
    e.type === "end" ? (e.ok === false ? "Fin : échec" : "Fin : ok") :
    e.type === "error" ? `Erreur ${esc(e.message ?? "")}` : esc(e.message ?? e.type);
  const state = e.state ? STATE[e.state] ?? esc(e.state) : "";
  const cost = e.costUsd != null ? `${e.costUsd.toFixed(2)} $` : "";
  return `<tr><td>${what}</td><td>${fmtDate(e.ts)}</td><td>${state}</td><td>${cost}</td></tr>`;
}

const CSS = `@page{size:1920px 1080px;margin:0}
*{box-sizing:border-box}body{margin:0;font:28px/1.4 system-ui,sans-serif;color:#111;background:#fff}
.page{width:1920px;height:1080px;padding:60px 80px;overflow:hidden;page-break-after:always;break-after:page}
.page h1{font-size:72px;margin:0 0 24px}.page h2{font-size:40px;margin:0 0 24px}
.frame{width:1760px;height:880px;overflow:hidden;border:2px solid #111}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #999;padding:8px;text-align:left}
.note{display:none}`;

/** Construit le document HTML complet du récap. */
export function buildRecap(designs: RecapDesign[], steps: RecapStep[]): string {
  const cover = `<section class="page cover"><h1>Récap des designs</h1>` +
    `<p>${fmtDate(Date.now())} · ${designs.length} design${designs.length > 1 ? "s" : ""}</p></section>`;
  const pages = designs.map((d) =>
    `<section class="page design"><h2>${esc(d.name)}</h2><div class="frame">${sanitize(d.html)}</div></section>`);
  const timeline = `<section class="page steps"><h2>Étapes du designer</h2><table>` +
    `<tr><th>Étape</th><th>Date</th><th>État</th><th>Coût</th></tr>${steps.map(stepRow).join("")}</table></section>`;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Récap des designs</title>
<!-- Pour Canva : Imprimer → Enregistrer en PDF (1 page = 1 diapositive), puis Canva → Importer un fichier -->
<style>${CSS}</style></head><body>
${[cover, ...pages, timeline].join("\n")}
</body></html>`;
}
