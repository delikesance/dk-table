/**
 * Versions nommées : instantanés complets du classeur, créés à la demande et stockés dans `DktDoc.history.snaps`
 * (donc dans le fichier `.dktable`). Module pur : chaque fonction renvoie un nouvel historique.
 */
import { addSnapshot } from "./history";
import type { DktDoc, History, Snapshot } from "./types";

/** Erreur levée quand une version ne peut pas être créée (nom vide ou déjà pris). */
export class VersionError extends Error {}

/**
 * Enregistre une version nommée de `doc` à l'instant `t`. Le nom est rogné ; un nom vide ou déjà utilisé
 * lève `VersionError`.
 */
export function createVersion(h: History, doc: DktDoc, name: string, t: number): History {
  const clean = name.trim();
  if (clean === "") throw new VersionError("Le nom de la version est vide.");
  if (h.snaps.some((s) => s.name === clean)) throw new VersionError(`La version « ${clean} » existe déjà.`);
  return addSnapshot(h, doc, clean, t);
}

/** Versions nommées, de la plus récente à la plus ancienne (à horodatage égal, la plus ajoutée d'abord). */
export function listVersions(h: History): Snapshot[] {
  return h.snaps
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.t - a.s.t || b.i - a.i)
    .map(({ s }) => s);
}
