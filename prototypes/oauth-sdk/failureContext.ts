/**
 * Contexte d'echec transmis a l'agent de retry (pur, plafonne).
 *
 * Quoi : `failureOf(m, changed, attempt)` construit la raison structuree d'un refus de fusion (nature, digest des tests rouges et des
 *        erreurs tsc, fichiers modifies, numero d'essai); `retryPrompt(f, ids, tries, max)` en fait la consigne de reprise.
 * Pourquoi : un retry aveugle repartait de zero sans savoir ce qui avait echoue; l'agent reprend maintenant la branche refusee
 *        (son code est dans son worktree) avec la sortie des verifications sous les yeux.
 * Usage : `retryPrompt(failureOf(merge, changedFiles, 2), ["tri"], 2, 3)`.
 */
import type { Failure } from "./runState";

/** Longueur maximale du texte de consigne (caracteres): le contexte d'un retry reste borne. */
export const MAX_RETRY_CHARS = 6000;

/** Refus de fusion, tel que rapporte par `git.mergeIfGreen`. */
export interface Refusal { reason?: string; kind?: string; failed?: string[] }

/** Raison structuree d'un refus. */
export function failureOf(m: Refusal, changed: string[], attempt: number): Failure {
  return { kind: m.kind, reason: (m.reason ?? "refus sans raison").slice(0, 3000), failed: (m.failed ?? []).slice(0, 30), changed: changed.slice(0, 50), attempt };
}

const KIND: Record<string, string> = {
  tsc: "erreurs de typage (tsc)", tests: "tests rouges", tree: "arbre fusionne different de l'arbre verifie", dev: "developpement inaccessible",
  conflict: "conflit avec developpement", install: "installation des dependances", commit: "commit impossible", empty: "aucun commit",
};

/** Consigne de reprise : essai n/max, nature du refus, tests rouges, raison complete, fichiers modifies, conduite a tenir. */
export function retryPrompt(f: Failure, cardIds: string[], tries: number, max: number): string {
  const lines = [
    `REPRISE (essai ${tries + 1} sur ${max}) des cartes ${cardIds.join(", ")} : ta tentative precedente n'a PAS ete fusionnee dans developpement.`,
    "Tu es dans le worktree de cette branche : le code de la tentative precedente y est deja, ne repars pas de zero.",
    `Nature du refus : ${KIND[f.kind ?? ""] ?? f.kind ?? "non precisee"} (tentative ${f.attempt + 1}).`,
  ];
  if (f.failed.length) lines.push("Tests en echec :", ...f.failed.map((t) => `- ${t}`));
  lines.push("Sortie des verifications (resume) :", f.reason);
  if (f.changed.length) lines.push("Fichiers modifies par la branche :", ...f.changed.map((p) => `- ${p}`));
  lines.push("Corrige la cause (jamais en affaiblissant ni supprimant un test existant), relance les tests concernes puis `npx tsc --noEmit`, et mets a jour `## Fait` / `## Non fait` du rapport.");
  const text = lines.join("\n");
  return text.length <= MAX_RETRY_CHARS ? text : text.slice(0, MAX_RETRY_CHARS - 20) + "\n[...tronque]";
}
