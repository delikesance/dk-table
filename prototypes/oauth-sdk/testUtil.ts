/**
 * Aides communes aux tests de la boucle : attentes conditionnelles, portes et depot git hermetique.
 *
 * Quoi : `waitFor(cond)` attend un etat (jamais une duree), `deferred()` fait une porte pour
 *        ordonner des taches sans `sleep`, `flush()` laisse passer les micro/macro-taches en attente,
 *        `gitEnv()` isole git de la config de la machine (identite, autocrlf, signature, hooks).
 * Pourquoi : sous Windows (antivirus, cmd.exe, machine chargee) un delai fixe tantot suffit, tantot non;
 *        une condition a laquelle on attend ne depend pas de la vitesse de la machine.
 * Usage : `await waitFor(() => got.length > 0)`; `const g = deferred(); ... g.resolve()`.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Attend que `cond` soit vraie (large plafond: il ne coute rien tant que la condition arrive); echoue sinon. */
export async function waitFor(cond: () => boolean | Promise<boolean>, timeoutMs = 20_000, what = "condition"): Promise<void> {
  const end = performance.now() + timeoutMs;
  while (!(await cond())) {
    if (performance.now() > end) throw new Error(`waitFor: ${what} jamais atteinte en ${timeoutMs} ms`);
    await new Promise((r) => setTimeout(r, 5));
  }
}

/** Porte: une promesse qu'on resout a la main. */
export interface Deferred { promise: Promise<void>; resolve(): void }
export function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
}

/** Laisse s'executer tout ce qui est deja en attente (micro-taches puis quelques tours de la boucle d'evenements). */
export async function flush(turns = 3): Promise<void> {
  for (let i = 0; i < turns; i++) await new Promise((r) => setTimeout(r, 0));
}

let cfg: string | undefined, tpl: string | undefined;
/** Environnement git hermetique: ni config globale/systeme, ni modeles de hooks, identite fixe, pas de CRLF ni de signature. */
export function gitEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  if (!cfg) {
    const d = mkdtempSync(join(tmpdir(), "gitenv-"));
    cfg = join(d, "gitconfig");
    writeFileSync(cfg, "[core]\n\tautocrlf = false\n\tfsync = none\n[gc]\n\tauto = 0\n[commit]\n\tgpgsign = false\n[tag]\n\tgpgsign = false\n[init]\n\tdefaultBranch = master\n[pull]\n\trebase = false\n");
    tpl = join(d, "template"); mkdirSync(tpl); // modele vide: git init ne copie plus les ~15 exemples de hooks (lent sous Windows)
  }
  return {
    ...process.env,
    GIT_CONFIG_GLOBAL: cfg, GIT_CONFIG_NOSYSTEM: "1", GIT_TEMPLATE_DIR: tpl, GIT_TERMINAL_PROMPT: "0",
    GIT_AUTHOR_NAME: "a", GIT_AUTHOR_EMAIL: "a@b", GIT_COMMITTER_NAME: "a", GIT_COMMITTER_EMAIL: "a@b",
    ...extra,
  };
}
