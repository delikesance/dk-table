/**
 * Boîte « mot de passe » (ouvrir un classeur chiffré, chiffrer, retirer) sur `openDialog`.
 * `onSubmit` reçoit la saisie ; s'il lève une erreur, elle s'affiche et la boîte reste ouverte.
 * Avec `confirm`, une seconde saisie doit être identique. Une saisie vide est refusée.
 */
import { openDialog } from "./dialog";

/** Options de la boîte : identifiant unique, titres, confirmation et action de validation. */
export interface PasswordOptions {
  id: string;
  title: string;
  /** Libellé du bouton de validation. */
  button: string;
  /** Demande une seconde saisie (création du mot de passe). */
  confirm: boolean;
  /** Reçoit le mot de passe ; une exception est affichée dans la boîte. */
  onSubmit: (password: string) => Promise<void>;
}

/** Ouvre la boîte mot de passe (une seule instance par `id`). */
export function openPasswordDialog(opts: PasswordOptions): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body";
  const again = opts.confirm
    ? '<label class="dk-dialog__check" style="display:block">Confirmer :<br><input type="password" name="pw2" autocomplete="new-password" style="width:100%;margin-top:4px"></label>'
    : "";
  body.innerHTML =
    '<label class="dk-dialog__check" style="display:block">Mot de passe :<br><input type="password" name="pw" autocomplete="current-password" style="width:100%;margin-top:4px"></label>' +
    again +
    '<p class="dk-dialog__error" role="alert"></p>' +
    `<button type="button" class="dk-dialog__btn" data-action="submit">${opts.button}</button>`;
  const box = openDialog(opts.id, opts.title, body);
  const pw = body.querySelector<HTMLInputElement>('input[name="pw"]')!;
  const pw2 = body.querySelector<HTMLInputElement>('input[name="pw2"]');
  const error = body.querySelector<HTMLElement>(".dk-dialog__error")!;
  const btn = body.querySelector<HTMLButtonElement>('[data-action="submit"]')!;

  /** Vérifie la saisie, lance `onSubmit` et ferme la boîte seulement si cela réussit. */
  btn.addEventListener("click", async () => {
    error.textContent = "";
    if (!pw.value) { error.textContent = "Saisissez un mot de passe."; return; }
    if (pw2 && pw2.value !== pw.value) { error.textContent = "Les deux mots de passe ne correspondent pas."; return; }
    btn.disabled = true;
    try {
      await opts.onSubmit(pw.value);
      box.querySelector<HTMLElement>('[data-action="close"]')!.click();
    } catch (e) {
      error.textContent = e instanceof Error ? e.message : String(e);
    } finally {
      btn.disabled = false;
    }
  });
}
