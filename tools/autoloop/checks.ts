/**
 * Vérifications lancées par l'orchestrateur (pas par l'agent): `npm test` et `tsc`.
 * Sans shell (execFile); un code de sortie non nul = échec dont la sortie est conservée.
 */
import { defaultExec, type ExecFn } from "./github";
import type { CheckResult } from "./roles/audit";

/** Vérification asynchrone injectable. */
export type ChecksFn = () => Promise<CheckResult[]>;

/** Commandes de vérification. */
const CHECKS: [string, string, string[]][] = [
  ["npm test", "npm", ["test"]],
  ["tsc", "npx", ["tsc", "--noEmit"]],
];

/** Exécute les vérifications avec `exec` (échec = exception portant la sortie). */
export function makeChecks(exec: ExecFn = defaultExec): ChecksFn {
  return async () => {
    const out: CheckResult[] = [];
    for (const [name, file, args] of CHECKS) {
      try {
        out.push({ name, ok: true, output: await exec(file, args) });
      } catch (e) {
        const x = e as { stdout?: string; stderr?: string; message?: string };
        out.push({ name, ok: false, output: `${x.stdout ?? ""}${x.stderr ?? ""}` || (x.message ?? "erreur") });
      }
    }
    return out;
  };
}
