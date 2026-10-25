/**
 * Mot de passe du classeur ouvert, gardé en mémoire pour la session seulement :
 * il n'est jamais écrit dans le fichier. Rouvrir le classeur redemande le mot de passe.
 */

let password: string | undefined;

/** Mot de passe à utiliser à l'enregistrement, ou undefined si le classeur n'est pas protégé. */
export function getPassword(): string | undefined {
  return password;
}

/** Fixe (ou retire, avec undefined) le mot de passe du classeur courant. */
export function setPassword(pw: string | undefined): void {
  password = pw;
}
