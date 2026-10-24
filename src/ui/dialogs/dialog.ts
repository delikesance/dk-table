/**
 * Boîte modale commune (Paramètres, À propos) : voile, titre, contenu, bouton Fermer.
 * Échap, Fermer ou un clic sur le voile la referment ; le focus revient à l'élément d'origine.
 * Une seule instance par `id` (rouvrir ne la duplique pas).
 */
import "./dialogs.css";

/** Ouvre la boîte `id` ; `body` est inséré sous le titre. Retourne la boîte (existante si déjà ouverte). */
export function openDialog(id: string, title: string, body: HTMLElement): HTMLElement {
  const existing = document.querySelector<HTMLElement>(`.dk-dialog[data-id="${id}"]`);
  if (existing) return existing;
  const prev = document.activeElement as HTMLElement | null;
  const scrim = document.createElement("div");
  scrim.className = "dk-dialog__scrim";
  const box = document.createElement("div");
  box.className = "dk-dialog"; box.dataset.id = id;
  box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", `dk-dialog-${id}`);
  box.innerHTML = `<h2 class="dk-dialog__title" id="dk-dialog-${id}">${title}</h2>`;
  const foot = document.createElement("div");
  foot.className = "dk-dialog__foot";
  foot.innerHTML = '<button type="button" class="dk-dialog__btn" data-action="close">Fermer</button>';
  box.append(body, foot);
  const close = (): void => { scrim.remove(); box.remove(); prev?.focus?.(); };
  foot.querySelector("button")!.addEventListener("click", close);
  scrim.addEventListener("click", close);
  box.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); close(); } });
  document.body.append(scrim, box);
  (box.querySelector<HTMLElement>("input, button") ?? box).focus();
  return box;
}
