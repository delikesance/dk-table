/**
 * Rapports perimes: reparation automatique des cartes « orphelines ».
 *
 * Quoi : un rapport `Statut : en-cours` sans agent actif (run interrompu) est archive (`.boucle/archives/<id>-<ts>.md`)
 *        et son empreinte est memorisee (`.boucle/perimes.jsonl`); le tableau ignore ensuite ce contenu exact
 *        (la carte repart en idee, sans anomalie). Un rapport reecrit (contenu different) compte de nouveau.
 * Pourquoi : signaler ne suffit pas, l'utilisateur ne doit pas nettoyer a la main apres chaque interruption.
 *        Aucune ecriture dans le depot: pas de commit parasite, rien a defaire.
 * Usage : `repairOrphans(cartes, lire, store)` au demarrage d'un run; `buildBoard({ ..., stale: store })`.
 */
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { BoardCard } from "./cards";

/** Empreinte du contenu d'un rapport. */
export const hashOf = (md: string): string => createHash("sha1").update(md).digest("hex");

/** Registre des rapports perimes. */
export interface StaleStore {
  /** id -> empreinte du dernier rapport perime de la carte. */
  hashes(): Promise<Map<string, string>>;
  /** Archive le rapport et memorise son empreinte. */
  retire(id: string, md: string): Promise<void>;
}

/** Registre en memoire (tests). */
export function createMemoryStale(): StaleStore {
  const m = new Map<string, string>();
  return { hashes: async () => new Map(m), retire: async (id, md) => { m.set(id, hashOf(md)); } };
}

/** Registre fichier JSONL + archives; ne leve jamais en lecture. */
export function createFileStale(file: string, archiveDir: string, now: () => number = Date.now): StaleStore {
  return {
    async hashes() {
      const out = new Map<string, string>();
      for (const line of (await readFile(file, "utf8").catch(() => "")).split(/\r?\n/)) {
        try { const e = JSON.parse(line); if (typeof e.id === "string" && typeof e.hash === "string") out.set(e.id, e.hash); } catch { /* ligne tronquee */ }
      }
      return out;
    },
    async retire(id, md) {
      const at = now();
      await mkdir(archiveDir, { recursive: true });
      await writeFile(join(archiveDir, `${id}-${at}.md`), md, "utf8");
      await mkdir(dirname(file), { recursive: true });
      await appendFile(file, JSON.stringify({ id, hash: hashOf(md), at }) + "\n", "utf8");
    },
  };
}

/** Archive les rapports des cartes orphelines; renvoie les ids repares. */
export async function repairOrphans(cards: BoardCard[], read: (path: string) => Promise<string>, store: StaleStore): Promise<string[]> {
  const fixed: string[] = [];
  for (const c of cards) {
    if (!c.anomalies.some((a) => a.startsWith("orpheline"))) continue;
    const md = await read(c.reportPath).catch(() => "");
    if (!md) continue;
    await store.retire(c.id, md);
    fixed.push(c.id);
  }
  return fixed;
}
