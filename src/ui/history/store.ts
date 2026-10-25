/**
 * État de l'historique du classeur ouvert : journal + instantanés (persistés dans le fichier) et « base »
 * (état au dernier chargement/enregistrement) servant à calculer le journal à la sauvegarde.
 * `loadHistory` à l'ouverture, `stampSave` avant écriture, `historyField` pour `toDoc`.
 */
import { addSnapshot, emptyHistory, recordChanges } from "../../io/history";
import type { DktDoc, History } from "../../io/types";

let history: History = emptyHistory();
let baseline: DktDoc | undefined;

/** Réinitialise l'état depuis un document chargé (son historique, base = lui-même). */
export function loadHistory(doc: DktDoc): void {
  history = doc.history ?? emptyHistory();
  baseline = doc;
}

/** Remplace la base (après une restauration, pour que la prochaine sauvegarde journalise le retour en arrière). */
export function setBaseline(doc: DktDoc): void { baseline = doc; }

/** Historique courant. */
export const currentHistory = (): History => history;

/** Champ `history` à ajouter à `toDoc` (vide tant que rien n'est enregistré). */
export const historyField = (): { history?: History } =>
  history.log.length || history.snaps.length ? { history } : {};

/** Journalise les changements depuis la base, puis renvoie `doc` avec l'historique; la base devient `doc`. */
export function stampSave(doc: DktDoc, now = Date.now()): DktDoc {
  if (baseline) history = recordChanges(history, baseline, doc, now);
  baseline = doc;
  return { ...doc, history };
}

/** Ajoute un instantané nommé de `doc`. */
export function takeSnapshot(doc: DktDoc, name: string, now = Date.now()): void {
  history = addSnapshot(history, doc, name, now);
}
