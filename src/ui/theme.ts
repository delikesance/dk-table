/**
 * Thème clair (bleu + papier) / sombre (nuit Hermes) : pose `data-theme` sur <html>,
 * que lit src/styles/theme-dark.css. « auto » suit la préférence système et ses changements.
 * Usage : `initTheme()` au démarrage ; `applyTheme("dark")` depuis une commande.
 */
export type ThemePref = "auto" | "light" | "dark";
export const THEME_KEY = "dk-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Thème effectif pour une préférence et l'état système. */
export function resolveTheme(pref: ThemePref, systemDark: boolean): "light" | "dark" {
  return pref === "auto" ? (systemDark ? "dark" : "light") : pref;
}

/** Préférence mémorisée (localStorage), « auto » par défaut ou si invalide. */
export function savedThemePref(): ThemePref {
  let v: string | null = null;
  try { v = localStorage.getItem(THEME_KEY); } catch { /* stockage indisponible */ }
  return v === "light" || v === "dark" || v === "auto" ? v : "auto";
}

function systemDark(): boolean {
  return typeof matchMedia === "function" && matchMedia(DARK_QUERY).matches;
}

/** Applique et mémorise une préférence de thème. */
export function applyTheme(pref: ThemePref): void {
  try { localStorage.setItem(THEME_KEY, pref); } catch { /* stockage indisponible */ }
  document.documentElement.dataset.theme = resolveTheme(pref, systemDark());
}

/** Applique la préférence mémorisée et suit le système tant qu'elle vaut « auto ». */
export function initTheme(): void {
  document.documentElement.dataset.theme = resolveTheme(savedThemePref(), systemDark());
  if (typeof matchMedia !== "function") return;
  matchMedia(DARK_QUERY).addEventListener?.("change", (e) => {
    if (savedThemePref() === "auto") document.documentElement.dataset.theme = e.matches ? "dark" : "light";
  });
}
