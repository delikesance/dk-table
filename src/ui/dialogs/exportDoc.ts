/** Boîte d'export du document ouvert (Ctrl+E, Fichier > Exporter le document…) : Markdown, HTML, PDF. */
import { openDialog } from "./dialog";
import type { App } from "../appTypes";

const FORMATS: ["md" | "html" | "pdf", string, string][] = [
  ["md", "Markdown", "Fichier .md, tableaux en texte"],
  ["html", "HTML", "Page autonome .html"],
  ["pdf", "PDF", "Impression : choisir « Enregistrer en PDF »"],
];

/** Ouvre la boîte ; un clic lance l'export et ferme la boîte. */
export function openExportDoc(app: App): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-export";
  for (const [kind, label, hint] of FORMATS) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "dk-dialog__btn dk-export__btn"; b.dataset.format = kind;
    b.innerHTML = `<strong>${label}</strong><small>${hint}</small>`;
    b.onclick = () => {
      document.querySelector<HTMLElement>('.dk-dialog[data-id="export-doc"] [data-action="close"]')?.click();
      void app.exportDoc(kind);
    };
    body.append(b);
  }
  openDialog("export-doc", "Exporter le document", body);
}
