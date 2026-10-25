/**
 * Recherche de racine pure (sans moteur) pour la valeur cible (`goalSeek.ts`):
 * sondes autour du point de départ (x0, x0 ± d, x0 ± 2d, x0 ± 4d…, d = max(1, |x0|))
 * jusqu'à trouver un changement de signe, puis bissection. Les sondes non finies
 * (erreur de formule, division par zéro) sont ignorées.
 */

/** Options: tolérance absolue sur |f(x)| et nombre maximal d'évaluations de `f`. */
export interface RootOptions {
  tol: number;
  maxEval: number;
}

/** Racine trouvée, ou raison de l'échec (`max-eval` = plafond atteint, `no-root` = pas de racine). */
export type RootResult =
  | { ok: true; x: number; evals: number }
  | { ok: false; reason: "no-root" | "max-eval"; evals: number };

/** Plus loin que ce nombre de doublements, la recherche d'encadrement abandonne. */
const MAX_DOUBLINGS = 60;

/** Racine de `f` près de `x0` (|f(x)| <= tol), ou l'échec explicite. */
export function findRoot(f: (x: number) => number, x0: number, opts: RootOptions): RootResult {
  const { tol, maxEval } = opts;
  let evals = 0;
  const probe = (x: number): number => {
    evals++;
    return f(x);
  };
  const done = (x: number): RootResult => ({ ok: true, x, evals });
  const fail = (reason: "no-root" | "max-eval"): RootResult => ({ ok: false, reason, evals });

  /** Bissection sur [a, b] (f(a), f(b) de signes opposés) jusqu'à |f| <= tol. */
  const bisect = (a: number, fa: number, b: number): RootResult => {
    for (;;) {
      if (evals >= maxEval) return fail("max-eval");
      const m = (a + b) / 2;
      // Intervalle réduit à la précision flottante: pas de racine atteignable.
      if (m === a || m === b) return fail("no-root");
      const fm = probe(m);
      if (!Number.isFinite(fm)) return fail("no-root");
      if (Math.abs(fm) <= tol) return done(m);
      if ((fm > 0) === (fa > 0)) {
        a = m;
        fa = fm;
      } else {
        b = m;
      }
    }
  };

  const y0 = probe(x0);
  if (Number.isFinite(y0) && Math.abs(y0) <= tol) return done(x0);
  const pts: { x: number; y: number }[] = [{ x: x0, y: y0 }];
  const d = Math.max(1, Math.abs(x0));

  // Encadrement: première sonde de signe opposé à une sonde finie précédente.
  for (let k = 0; k < MAX_DOUBLINGS; k++) {
    for (const x of [x0 + d * 2 ** k, x0 - d * 2 ** k]) {
      if (evals >= maxEval) return fail("max-eval");
      const y = probe(x);
      if (!Number.isFinite(y)) continue;
      if (Math.abs(y) <= tol) return done(x);
      const other = pts.find((p) => Number.isFinite(p.y) && p.y * y < 0);
      if (other) return other.x < x ? bisect(other.x, other.y, x) : bisect(x, y, other.x);
      pts.push({ x, y });
    }
  }
  return fail("no-root");
}
