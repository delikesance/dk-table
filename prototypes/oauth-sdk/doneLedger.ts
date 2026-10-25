/**
 * Registre des cartes terminees : append-only, durable, jamais purge.
 *
 * Pourquoi : une carte « Terminée » du moodboard ne doit jamais disparaitre, ni quand la liste
 *        d'idees est regeneree, ni quand TODO.md passe l'idee a `[x]`, ni apres un redemarrage.
 *        Le registre garde un instantane de la carte et de son rapport (les captures restent dans le depot).
 * Format : une ligne JSON par carte (`.boucle/termines.jsonl`, ignore par git); lignes illisibles ignorees;
 *        la premiere ligne d'un id fait foi, une carte deja enregistree n'est jamais reecrite.
 * Usage : `createFileLedger(chemin)` (reel) / `createMemoryLedger()` (tests) -> `{ load, record }`.
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

/** Instantane d'une carte terminee. */
export interface DoneEntry {
  id: string; title: string; summary: string; source: string;
  axis?: "new" | "missing" | "neglected" | "poor";
  reportPath: string;
  /** Rapport markdown complet (relisible meme si le fichier du depot disparait). */
  markdown: string;
  doneAt: number;
}

/** Registre injecte dans le tableau. */
export interface DoneLedger {
  /** Toutes les cartes terminees connues (ordre d'enregistrement). */
  load(): Promise<DoneEntry[]>;
  /** Ajoute la carte si son id est absent; sans effet sinon. */
  record(e: DoneEntry): Promise<void>;
}

const valid = (x: unknown): x is DoneEntry => {
  const e = x as DoneEntry;
  return !!e && typeof e.id === "string" && typeof e.title === "string" && typeof e.markdown === "string" && typeof e.reportPath === "string";
};

/** Registre en memoire (tests). */
export function createMemoryLedger(): DoneLedger {
  const all = new Map<string, DoneEntry>();
  return { load: async () => [...all.values()], record: async (e) => { if (!all.has(e.id)) all.set(e.id, e); } };
}

/** Registre fichier JSONL; les ecritures sont serialisees (deux tableaux simultanes n'ecrivent pas deux fois). */
export function createFileLedger(file: string): DoneLedger {
  let chain: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<DoneEntry[]> => {
    const text = await readFile(file, "utf8").catch(() => "");
    const out = new Map<string, DoneEntry>();
    for (const line of text.split(/\r?\n/)) {
      try { const e = JSON.parse(line); if (valid(e) && !out.has(e.id)) out.set(e.id, e); } catch { /* ligne tronquee: ignoree */ }
    }
    return [...out.values()];
  };
  return {
    load: () => chain.then(read),
    record: (e) => {
      const next = chain.then(async () => {
        if ((await read()).some((x) => x.id === e.id)) return;
        await mkdir(dirname(file), { recursive: true });
        await appendFile(file, JSON.stringify(e) + "\n", "utf8");
      }).catch(() => { /* disque indisponible: la carte reste visible tant que le depot la porte */ });
      chain = next;
      return next;
    },
  };
}
