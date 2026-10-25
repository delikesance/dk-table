/**
 * Primitives de concurrence de la boucle : verrou FIFO et reserve de travailleurs.
 *
 * Quoi : `createMutex()` serialise des sections critiques asynchrones (fusions dans `developpement`);
 *        `runPool(items, n, fn)` execute `fn` sur les elements avec au plus `n` appels simultanes.
 * Pourquoi : les agents en parallele travaillent chacun dans leur worktree, mais tout ce qui touche
 *        l'arbre principal (checkout, fusion, push) doit passer un par un.
 * Usage : `const m = createMutex(); await m.run(() => fusion())`; `await runPool(cartes, 3, (c) => agent(c))`.
 */

/** Verrou asynchrone FIFO. */
export interface Mutex { run<T>(fn: () => Promise<T>): Promise<T> }

/** Mesure d'un passage dans un verrou nomme: attente avant d'entrer, temps passe dedans. */
export interface LockStat { name: string; waitMs: number; holdMs: number }

/** Options du verrou: nom et rappel de mesure (journal des temps d'attente), horloge injectable. */
export interface MutexOpts { name?: string; onLock?: (s: LockStat) => void; now?: () => number }

/** Cree un verrou: une erreur d'une section libere le verrou et ne remonte qu'a son appelant. */
export function createMutex(o: MutexOpts = {}): Mutex {
  let tail: Promise<unknown> = Promise.resolve();
  const now = o.now ?? (() => performance.now());
  return {
    run<T>(fn: () => Promise<T>): Promise<T> {
      const asked = now();
      const timed = async () => {
        const start = now();
        try { return await fn(); } finally {
          try { o.onLock?.({ name: o.name ?? "verrou", waitMs: Math.round(start - asked), holdMs: Math.round(now() - start) }); } catch { /* la mesure ne casse jamais le verrou */ }
        }
      };
      const next = tail.then(timed, timed);
      tail = next.catch(() => undefined);
      return next;
    },
  };
}

/** Options de `runPool`. */
export interface PoolOpts<T> {
  /** Erreur d'un element (les autres continuent). */
  onError?: (err: unknown, item: T) => void;
  /** Vrai: ne plus demarrer d'element (ceux en cours finissent). */
  stop?: () => boolean;
}

/** Traite `items` avec au plus `n` appels simultanes; resultats dans l'ordre, `undefined` si erreur ou non demarre. */
export async function runPool<T, R>(items: T[], n: number, fn: (item: T, i: number) => Promise<R>, o: PoolOpts<T> = {}): Promise<(R | undefined)[]> {
  const out: (R | undefined)[] = new Array(items.length).fill(undefined);
  let next = 0;
  const worker = async () => {
    while (next < items.length && !o.stop?.()) {
      const i = next++;
      try { out[i] = await fn(items[i], i); } catch (e) { o.onError?.(e, items[i]); }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, worker));
  return out;
}
