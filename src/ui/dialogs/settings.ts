/**
 * Paramètres (Fichier > Paramètres…, Ctrl+,) : réglages persistants de l'application.
 * Aujourd'hui : afficher l'accueil au démarrage (clé `dk-table.home`, lue par main.ts).
 * Le thème reste dans le menu Affichage (pas de doublon).
 */
import { openDialog } from "./dialog";

export const HOME_KEY = "dk-table.home";

/** Vrai si l'accueil doit s'afficher au lancement (défaut : oui). */
export function homeOnStartup(): boolean {
  try { return localStorage.getItem(HOME_KEY) !== "0"; } catch { return true; }
}

/** Ouvre la boîte Paramètres (une seule instance). */
export function openSettings(): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body";
  body.innerHTML =
    '<label class="dk-dialog__check"><input type="checkbox" name="home"> Afficher l\'accueil au démarrage</label>';
  const box = body.querySelector<HTMLInputElement>('input[name="home"]')!;
  box.checked = homeOnStartup();
  box.addEventListener("change", () => {
    try { localStorage.setItem(HOME_KEY, box.checked ? "1" : "0"); } catch { /* stockage indisponible */ }
  });
  openDialog("settings", "Paramètres", body);
}
