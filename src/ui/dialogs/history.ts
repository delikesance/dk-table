/**
 * Historique local (palette « Historique et versions… ») : journal de la cellule active, curseur temporel
 * (différences entre un état passé et l'actuel, restauration), instantanés nommés (création, comparaison,
 * restauration). Logique pure dans `io/history.ts`, état dans `ui/history/store.ts`; diff rendu par `renderDiff`.
 */
import { openDialog } from "./dialog";
import { renderDiff } from "./diff";
import { cellHistory, rewind, snapshotDoc, timeline } from "../../io/history";
import { currentHistory, journalNow, setBaseline, takeSnapshot } from "../history/store";
import type { DktDoc } from "../../io/types";
import type { App } from "../appTypes";
import "./dataDialogs.css";

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const when = (t: number): string => new Date(t).toLocaleString("fr-FR");

/** Remplace le classeur par `doc` en gardant l'historique; la prochaine sauvegarde journalise le retour en arrière. */
function restore(app: App, doc: DktDoc): void {
  const prev = app.toDoc();
  app.loadDoc({ ...doc, history: currentHistory() }, app.path);
  setBaseline(prev);
}

/** Ouvre le dialogue (une seule instance). */
export function openHistory(app: App): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-data dk-hist";
  const cur = app.toDoc();
  journalNow(cur); // les modifications non enregistrées entrent au journal
  const sheet = cur.active ?? cur.sheets[0].id, key = app.selection();
  const times = timeline(currentHistory());
  const log = cellHistory(currentHistory(), sheet, key);
  body.innerHTML = `<h3 class="dk-diff__sheet">Cellule ${esc(key)}</h3>
<ul class="dk-hist__cell">${log.length ? log.map((e) => `<li>${when(e.t)} : ${esc(e.from || "(vide)")} → ${esc(e.to || "(vide)")}</li>`).join("") : "<li>Aucune modification enregistrée.</li>"}</ul>
<h3 class="dk-diff__sheet">Voyage dans le temps</h3>
<input type="range" min="0" max="${times.length}" value="${times.length}" aria-label="Instant" ${times.length ? "" : "disabled"}>
<p class="dk-data__msg dk-hist__when"></p><div class="dk-diff dk-hist__diff"></div>
<button type="button" class="dk-dialog__btn" data-action="restore" disabled>Restaurer cet état</button>
<h3 class="dk-diff__sheet">Instantanés</h3>
<div class="dk-data__field"><input name="snap" placeholder="Nom" maxlength="40"><button type="button" class="dk-dialog__btn" data-action="snap">Créer</button></div>
<ul class="dk-hist__snaps"></ul>`;
  const box = openDialog("history", "Historique et versions", body);
  const $ = <T extends HTMLElement>(s: string): T => body.querySelector<T>(s)!;
  const diffEl = $(".dk-hist__diff"), whenEl = $(".dk-hist__when"), rest = $<HTMLButtonElement>('[data-action="restore"]');
  let target: DktDoc | undefined;
  const show = (doc: DktDoc | undefined, label: string): void => {
    target = doc; rest.disabled = !doc; whenEl.textContent = label;
    if (doc) renderDiff(diffEl, app.toDoc(), doc); else diffEl.textContent = "";
  };
  $<HTMLInputElement>('input[type="range"]').addEventListener("input", (e) => {
    const i = Number((e.target as HTMLInputElement).value);
    if (i >= times.length) show(undefined, "État actuel");
    else show(rewind(app.toDoc(), currentHistory(), times[i]), when(times[i]));
  });
  rest.addEventListener("click", () => { if (target) { restore(app, target); box.querySelector<HTMLElement>('[data-action="close"]')!.click(); } });
  const snaps = (): void => {
    $(".dk-hist__snaps").innerHTML = currentHistory().snaps.map((s, i) =>
      `<li>${esc(s.name)} · ${when(s.t)} <button type="button" class="dk-dep__link" data-snap="${i}">Comparer</button></li>`).join("");
    body.querySelectorAll<HTMLElement>("[data-snap]").forEach((b) => b.addEventListener("click", () => {
      const s = currentHistory().snaps[Number(b.dataset.snap)];
      show(snapshotDoc(s, app.toDoc()), `Instantané « ${s.name} »`);
    }));
  };
  $('[data-action="snap"]').addEventListener("click", () => {
    const name = $<HTMLInputElement>('input[name="snap"]').value.trim();
    if (!name) return;
    takeSnapshot(app.toDoc(), name);
    snaps();
  });
  snaps();
}
