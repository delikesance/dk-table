/** Surlignage formules / constantes : bascule globale (classe `dk-kinds` sur `<html>`); les classes `dkg-kf` / `dkg-kc` sont posées par `markKind`. */

/** Active / désactive l'affichage du surlignage; renvoie l'état. */
export function toggleKinds(): boolean {
  return document.documentElement.classList.toggle("dk-kinds");
}

/** Le surlignage est-il actif ? */
export function kindsOn(): boolean {
  return document.documentElement.classList.contains("dk-kinds");
}
