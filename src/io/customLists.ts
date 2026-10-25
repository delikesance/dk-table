/**
 * Listes personnalisées persistées (localStorage par défaut, store injectable comme `io/recents.ts`).
 * `lists()` renvoie une copie; `add(items)` valide via `engine/custom-lists.ts` et n'écrit rien en cas de refus.
 */
import { validateList, type ListCheck } from "../engine/custom-lists";
import type { KeyValueStore } from "./recents";

const KEY = "dk-table.customLists";

/** Vrai si la valeur stockée est une liste d'au moins 2 chaînes. */
const isList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length >= 2 && v.every((s) => typeof s === "string");

/** Gestionnaire des listes utilisateur; store null = mémoire seule. */
export function createCustomLists(store: KeyValueStore | null) {
  /** Relit les listes, en tolérant les données absentes ou corrompues. */
  const load = (): string[][] => {
    try {
      const v = JSON.parse(store?.getItem(KEY) ?? "[]");
      return Array.isArray(v) ? v.filter(isList) : [];
    } catch { return []; }
  };
  let items = load();
  return {
    /** Listes enregistrées, dans l'ordre d'ajout. */
    lists: (): string[][] => items.map((l) => [...l]),
    /** Valide puis enregistre une liste; renvoie le résultat de la validation. */
    add(raw: string[]): ListCheck {
      const r = validateList(raw, items);
      if (!r.ok) return r;
      items = [...items, r.list];
      try { store?.setItem(KEY, JSON.stringify(items)); } catch { /* quota: reste en mémoire */ }
      return r;
    },
  };
}

/** Type du gestionnaire (pour l'injection dans les dialogues). */
export type CustomLists = ReturnType<typeof createCustomLists>;

/** Instance de l'application, adossée à localStorage quand il est disponible. */
export const customLists = createCustomLists(typeof localStorage !== "undefined" ? localStorage : null);
