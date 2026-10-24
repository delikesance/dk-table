/**
 * Accueil (refonte Hermes, H4) : à gauche le nom, trois actions et les fichiers récents ; à droite l'Atlas.
 * Aucun texte décoratif. Chaque choix ferme l'accueil puis lance l'action ; Échap ferme (classeur vierge).
 * Affiché par main.ts au lancement (sauf `?onboarding=0` ou réglage « accueil au démarrage » décoché).
 */
import "./onboarding.css";
import { atlasFigure } from "../art";

/** Actions de l'accueil (branchées sur fileops par main.ts). */
export interface HomeActions {
  recents(): { path: string; name: string }[];
  onNew(): void;
  onOpen(): void;
  onImportCsv(): void;
  onOpenRecent(path: string): void;
}

/** Échappe un texte pour innerHTML. */
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Bouton d'action ; `hint` = raccourci affiché en mono. */
const btn = (action: string, label: string, hint = "", primary = false): string =>
  `<button type="button" class="ob__btn${primary ? " ob__btn--primary" : ""}" data-action="${action}">${label}` +
  (hint ? ` <kbd class="ob__kbd">${hint}</kbd>` : "") + "</button>";

/** Montre l'accueil dans `host` (couvre l'application). Retourne la fonction de fermeture. */
export function showOnboarding(host: HTMLElement, a: HomeActions): () => void {
  const prev = document.activeElement as HTMLElement | null;
  const el = document.createElement("div");
  el.className = "ob";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Accueil dk-table");
  const recents = a.recents();
  const list = recents.map((r) =>
    `<li><button type="button" class="ob__recent" data-recent="${esc(r.path)}"><span class="ob__name">${esc(r.name)}</span>` +
    `<span class="ob__path">${esc(r.path)}</span></button></li>`).join("");
  el.innerHTML =
    '<div class="ob__side"><div class="ob__mark" aria-hidden="true"><span>DK</span><span>TABLE</span></div>' +
    `<div class="ob__actions">${btn("new", "Nouveau classeur", "Ctrl N", true)}${btn("open", "Ouvrir", "Ctrl O")}${btn("import", "Importer CSV")}</div>` +
    (recents.length ? `<section class="ob__recents" aria-labelledby="ob-recents"><h2 id="ob-recents" class="ob__h">Récents</h2><ul class="ob__list">${list}</ul></section>` : "") +
    "</div>";
  el.append(atlasFigure("ob__art"));
  const close = (): void => { el.remove(); prev?.focus?.(); };
  const run: Record<string, () => void> = { new: a.onNew, open: a.onOpen, import: a.onImportCsv };
  el.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-action],[data-recent]");
    if (!t) return;
    close();
    if (t.dataset.recent !== undefined) a.onOpenRecent(t.dataset.recent);
    else run[t.dataset.action!]?.();
  });
  el.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  host.appendChild(el);
  el.querySelector<HTMLElement>('[data-action="new"]')!.focus();
  return close;
}
