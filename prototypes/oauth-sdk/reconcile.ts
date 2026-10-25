/**
 * Reconciliateur : l'etat d'une carte est calcule, jamais saisi.
 *
 * Machine a etats : idee -> en-cours -> preuves -> termine (+ bloque, piste). Invariants :
 *   I1 « en-cours » seulement si un agent du lot actif la traite (une case TODO ouverte ne suffit plus);
 *   I2 un rapport « en cours » sans agent actif est une carte orpheline: retour a idee + anomalie;
 *   I3 termine = rapport termine + preuves valides, sinon preuves (liste de ce qui manque);
 *   I4 idee cochee au TODO sans rapport: preuves (rapport manquant) + anomalie, jamais invisible;
 *   I6 inscrite au registre = termine, definitivement; I7 pur: memes fichiers, meme resultat.
 * Usage : `reconcileCard({ status, report, proof, active, ledgered })` -> `{ state, missing, anomalies }`.
 */
import type { CardState, Report, Validation } from "./card";

/** Entrees d'une carte (toutes lues dans le depot ou l'etat de la tournee). */
export interface ReconcileInput {
  /** Statut du moodboard: `done` = idee cochee `[x]` au TODO. */
  status: "found" | "developing" | "lead" | "done";
  report?: Report;
  /** Validation des preuves du rapport (ignoree sans rapport). */
  proof: Validation;
  /** Un agent de la tournee en cours traite cette carte. */
  active: boolean;
  ledgered: boolean;
  /** Le rapport porte des preuves ecrites par le code (fusion verte): un `en-cours` sans agent est un travail partiel a reprendre, pas un orphelin. */
  proven?: boolean;
}

/** Etat justifie + preuves manquantes + incoherences detectees. */
export interface Reconciled { state: CardState; missing: string[]; anomalies: string[] }

/** Calcule l'etat unique d'une carte. */
export function reconcileCard(i: ReconcileInput): Reconciled {
  const out = (state: CardState, missing: string[] = [], anomalies: string[] = []): Reconciled => ({ state, missing, anomalies });
  if (i.ledgered) return out("termine");
  const r = i.report;
  if (!r) {
    if (i.status === "done") return out("preuves", ["rapport"], ["finie (TODO coche) sans rapport : rapport a ecrire"]);
    if (i.active) return out("en-cours");
    return out(i.status === "lead" ? "piste" : "idee");
  }
  if (r.status === "termine") return i.proof.ok ? out("termine") : out("preuves", i.proof.missing);
  if (r.status === "bloque") return out("bloque");
  if (i.active || i.proven) return out("en-cours");
  return out("idee", [], ["orpheline : rapport en cours sans agent actif"]);
}
