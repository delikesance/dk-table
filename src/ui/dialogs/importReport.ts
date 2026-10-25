/**
 * Rapport d'import CSV « texte d'abord » : pour chaque colonne dont des valeurs auraient été converties à tort
 * (zéros de tête, SEPT2, IBAN...), montre le motif et des exemples; la case « Convertir » accepte la conversion
 * de la colonne, sinon elle reste du texte. Sans valeur risquée, le fichier est importé sans dialogue.
 */
import { openDialog } from "./dialog";
import { importTextFirst, type ColumnReport } from "../../io/csvText";
import type { App } from "../appTypes";
import "./dataDialogs.css";

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** Ligne d'une colonne du rapport. */
function row(c: ColumnReport): string {
  return `<li class="dk-import__col"><label><input type="checkbox" data-col="${c.col}"> Convertir</label>
<strong>${c.col}${c.header ? ` · ${esc(c.header)}` : ""}</strong> : ${c.count} valeur(s) gardée(s) en texte
<span class="dk-data__msg">${esc(c.reasons.join(", "))} — ex. ${c.examples.map(esc).join(", ")}</span></li>`;
}

/** Importe `text` comme feuille `name`; ouvre le rapport si des conversions risquées ont été évitées. */
export function openImportReport(app: App, name: string, text: string): void {
  const first = importTextFirst(text);
  if (!first.columns.length) { app.importSheet(name, first.sheet); return; }
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-data dk-import";
  body.innerHTML = `<p class="dk-data__msg">Conversions évitées : ces valeurs restent du texte.</p><ul class="dk-import__list">${first.columns.map(row).join("")}</ul>
<button type="button" class="dk-dialog__btn" data-action="import">Importer</button>`;
  const box = openDialog("import-report", "Import CSV : rapport", body);
  body.querySelector('[data-action="import"]')!.addEventListener("click", () => {
    const refuse = [...body.querySelectorAll<HTMLInputElement>("input[data-col]")].filter((i) => i.checked).map((i) => i.dataset.col!);
    app.importSheet(name, importTextFirst(text, { refuse }).sheet);
    box.querySelector<HTMLElement>('[data-action="close"]')!.click();
  });
}
