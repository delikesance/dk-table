/**
 * Memo a duree courte d'une fonction asynchrone sans argument.
 * Pourquoi : le board et la liste des designs sont relus par plusieurs onglets et par les rafales
 *        d'evenements; un resultat de moins de `ttlMs` est reutilise (appels simultanes partages).
 * Usage : `const list = memo(() => store.list(), 2000)`.
 */
export function memo<T>(fn: () => Promise<T>, ttlMs: number, now: () => number = Date.now): () => Promise<T> {
  let at = -Infinity;
  let cur: Promise<T> | undefined;
  return () => {
    if (cur && now() - at < ttlMs) return cur;
    at = now();
    const p = fn();
    cur = p;
    p.catch(() => { if (cur === p) cur = undefined; });
    return p;
  };
}

/** Comme `memo`, mais un changement de `version()` (ex. compteur d'evenements) invalide aussitot, sans attendre le delai. */
export function memoBy<T>(fn: () => Promise<T>, ttlMs: number, version: () => number, now: () => number = Date.now): () => Promise<T> {
  let at = -Infinity, ver = NaN;
  let cur: Promise<T> | undefined;
  return () => {
    if (cur && ver === version() && now() - at < ttlMs) return cur;
    at = now(); ver = version();
    const p = fn();
    cur = p;
    p.catch(() => { if (cur === p) cur = undefined; });
    return p;
  };
}
