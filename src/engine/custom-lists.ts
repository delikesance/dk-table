/**
 * Listes personnalisées (ex. Bas, Moyen, Haut): validation et lecture de saisie. Module pur, sans stockage
 * (voir `io/customLists.ts`). Une liste est refusée si elle est vide, a moins de 2 éléments, contient un
 * doublon (casse ignorée) ou est identique à une liste existante.
 */

/** Résultat de validation: liste nettoyée (espaces retirés) ou raison du refus. */
export type ListCheck = { ok: true; list: string[] } | { ok: false; reason: string };

/** Valide une liste saisie contre les listes déjà enregistrées. Éléments vides ignorés. */
export function validateList(items: string[], existing: string[][]): ListCheck {
  const list = items.map((s) => s.trim()).filter((s) => s !== "");
  if (list.length < 2) return { ok: false, reason: "Une liste doit contenir au moins 2 éléments." };
  const keys = list.map((s) => s.toLowerCase());
  if (new Set(keys).size !== keys.length) return { ok: false, reason: "Un élément est en double." };
  const dup = existing.some((l) => l.length === keys.length && l.every((s, i) => s.toLowerCase() === keys[i]));
  if (dup) return { ok: false, reason: "Cette liste existe déjà." };
  return { ok: true, list };
}

/** Découpe une saisie libre (un élément par ligne, ou séparé par virgule / point-virgule). */
export function parseListText(text: string): string[] {
  return text.split(/[\n,;]/).map((s) => s.trim()).filter((s) => s !== "");
}
