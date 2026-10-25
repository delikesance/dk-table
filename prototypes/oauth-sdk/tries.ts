/**
 * Borne dure d'essais par carte : au-dela, la carte est bloquee avec une raison structuree, plus aucun agent n'est lance.
 *
 * Quoi : `enforceLimit(state, cards, max)` marque `deferred = { kind: "max-tries", reason }` toute carte non terminee dont
 *        le compteur d'essais (state.json) a atteint `max`; renvoie les cartes nouvellement bloquees.
 * Pourquoi : sans borne, une carte qui echoue toujours relancait des agents indefiniment (la rotation du planificateur la reprenait).
 * Usage : appele par rounds.ts apres chaque lecture du tableau.
 */
import { MAX_TRIES } from "./limits";
import type { StateStore } from "./runState";

/** Bloque les cartes ayant atteint la limite; ecrit l'etat si besoin. */
export function enforceLimit(state: StateStore, cards: { id: string; state: string }[], max = MAX_TRIES): { id: string; reason: string }[] {
  const out: { id: string; reason: string }[] = [];
  const s = state.load();
  for (const c of cards) {
    const run = s.cards[c.id];
    if (c.state === "termine" || !run || run.deferred || run.tries < max) continue;
    out.push({ id: c.id, reason: `${run.tries} essais sans carte terminee (limite ${max})${run.lastReason ? ` ; derniere raison : ${run.lastReason}` : ""}${run.branch ? ` ; travail conserve sur la branche ${run.branch}` : ""}` });
  }
  if (out.length) state.update((st) => { for (const o of out) { const r = st.cards[o.id]; if (r) r.deferred = { kind: "max-tries", reason: o.reason }; } });
  return out;
}
