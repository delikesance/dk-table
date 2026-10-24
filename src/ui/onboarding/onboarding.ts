/** Onboarding / home screen: lists the workbook sheets ("projects") and offers a create button. */
import "./onboarding.css";
import type { SheetInfo } from "../tabs/tabs";

/** The slice of the app handle the home screen needs. */
export interface OnboardingApp {
  sheets(): SheetInfo[];
  addSheet(): void;
  switchSheet(id: string): void;
}

/** Escape text for innerHTML. */
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Show the home screen inside `host` (overlay). Create → new sheet + enter the grid;
 * item click → open that sheet; Escape or any choice closes it. Returns a closer.
 */
export function showOnboarding(host: HTMLElement, app: OnboardingApp): () => void {
  const prev = document.activeElement as HTMLElement | null;
  const el = document.createElement("div");
  el.className = "ob";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-labelledby", "ob-title");
  const list = app.sheets();
  const items = list.map((s) => `<li role="listitem"><button type="button" class="ob__item" data-sheet="${esc(s.id)}">${esc(s.name)}</button></li>`).join("");
  el.innerHTML =
    '<div class="ob__panel"><p class="ob__label">// dk-table</p><h1 id="ob-title" class="ob__title">Vos projets</h1>' +
    (list.length ? `<ul role="list" class="ob__list">${items}</ul>` : '<p class="ob__empty">Aucun projet pour le moment.</p>') +
    '<button type="button" class="ob__create" data-action="create">Créer</button></div>';
  const close = (): void => { el.remove(); prev?.focus?.(); };
  el.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-sheet],[data-action]");
    if (!t) return;
    if (t.dataset.action === "create") app.addSheet();
    else app.switchSheet(t.dataset.sheet!);
    close();
  });
  el.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  host.appendChild(el);
  el.querySelector<HTMLElement>('[data-action="create"]')!.focus();
  return close;
}
