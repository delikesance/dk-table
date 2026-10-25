/**
 * Panneau « Qui utilise cette cellule ? » : précédents et dépendants de la cellule active (`engine/model/depmap`),
 * entre feuilles, cellules vivantes et documents dk doc. Un clic sur un lien y navigue (feuille + cellule, ou document).
 */
import { openDialog } from "./dialog";
import { dependencyMap, type DepMap, type DepRef } from "../../engine/model/depmap";
import type { App } from "../appTypes";
import "./dataDialogs.css";

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const KIND = { cell: "", live: " (vivante)", doc: " (document)" };

/** Une liste de liens `DepRef` sous un titre. */
function list(title: string, side: string, refs: DepRef[]): string {
  const items = refs.map((r, i) => `<li><button type="button" class="dk-dep__link" data-ref="${side}${i}" data-kind="${r.kind}">${esc(r.sheet)}${r.key ? "!" + r.key : ""}${KIND[r.kind]}</button></li>`);
  return `<h3 class="dk-diff__sheet">${title}</h3>` + (items.length ? `<ul class="dk-dep__list">${items.join("")}</ul>` : '<p class="dk-data__msg">Aucun.</p>');
}

/** Remplit `el` avec la carte; `go` reçoit le lien cliqué. */
export function renderDepMap(el: HTMLElement, map: DepMap, go: (r: DepRef) => void): void {
  el.innerHTML = list("Précédents (cette cellule lit)", "p", map.precedents) + list("Dépendants (utilisent cette cellule)", "d", map.dependents);
  el.querySelectorAll<HTMLElement>("[data-ref]").forEach((b) => {
    const id = b.dataset.ref!;
    b.addEventListener("click", () => go((id[0] === "p" ? map.precedents : map.dependents)[Number(id.slice(1))]));
  });
}

/** Navigue vers un lien : document, ou feuille puis cellule. */
function navigate(app: App, r: DepRef): void {
  if (r.kind === "doc") { void app.openDoc(r.sheetId); return; }
  app.switchSheet(r.sheetId);
  app.select(r.key);
}

/** Ouvre le panneau pour la cellule active (une seule instance). */
export function openDepMap(app: App): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-data";
  const doc = app.toDoc();
  const sheetId = doc.active ?? doc.sheets[0].id;
  const sel = app.selection();
  body.innerHTML = `<p class="dk-data__msg">Cellule ${esc(sel)}</p><div class="dk-dep"></div>`;
  const box = openDialog("depmap", "Qui utilise cette cellule ?", body);
  renderDepMap(body.querySelector<HTMLElement>(".dk-dep")!, dependencyMap(doc, sheetId, sel), (r) => {
    navigate(app, r);
    box.querySelector<HTMLElement>('[data-action="close"]')!.click();
  });
}
