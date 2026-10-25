/**
 * Verifications avant fusion (tests + tsc) et worktree de reference, extraits de git.ts.
 *
 * Quoi : `createChecks({ run, git, cwd, lock, dev })` -> `{ checks(dir), dispose() }`. `checks` lance `npm test` et `tsc`
 *        (une suite a la fois) et tolere un test deja rouge sur la base seulement s'il n'est lie a aucun fichier modifie.
 * Pourquoi : git.ts depassait 200 lignes; comportement inchange.
 * Usage : voir git.ts (`createGitFlow`).
 */
import { failureDigest } from "./cleanOutput";
import { createMutex, type LockStat, type Mutex } from "./concurrency";
import type { Run } from "./git";
import { relatedFailures } from "./mergeGuard";
import type { Proof } from "./card";
import { failedFiles, failedTests, onlyOnBranch, testCount } from "./testFailures";

/** Dependances fournies par le flux git. */
export interface ChecksDeps {
  run: Run;
  git: (args: string[], at?: string) => ReturnType<Run>;
  cwd: string;
  /** Verrou de l'arbre principal (creation du worktree de reference). */
  lock: Mutex;
  /** Branche de base. */
  dev: string;
  /** Mesure des attentes de verrous. */
  onLock?: (s: LockStat) => void;
}

/** Cree les verifications liees a un depot. */
export function createChecks({ run, git, cwd, lock, dev: DEV, onLock }: ChecksDeps) {
  /** Worktree de reference (developpement detache), cree a la demande: sert a savoir si un test rouge l'est deja sur la base. */
  const baseLock = createMutex({ name: "baseLock", onLock });
  let baseDir: string | null = null;
  /** Met le worktree de reference sur `developpement` (cree et installe a la demande); `null` si impossible. A appeler sous `baseLock`. */
  async function ensureBase(): Promise<string | null> {
    if (!baseDir) {
      const dir = await lock.run(async () => {
        const d = `${cwd.replace(/[\\/]+$/, "")}/.claude/worktrees/base-${Date.now()}`;
        return (await git(["worktree", "add", "--detach", d, DEV])).code === 0 ? d : null;
      });
      if (!dir) return null;
      if ((await run("npm", ["ci", "--prefer-offline", "--no-audit"], dir)).code !== 0) { await git(["worktree", "remove", "--force", dir]); return null; }
      baseDir = dir;
    } else await git(["checkout", "--detach", DEV], baseDir);
    return baseDir;
  }

  async function baseFailures(files: string[]): Promise<string[] | null> {
    return baseLock.run(async () => {
      const dir = await ensureBase();
      if (!dir) return null;
      const r = await run("npm", ["test", "--", ...files], dir);
      return r.code === 0 ? [] : failedTests(r.out);
    });
  }

  /** Suite complete + tsc sur `developpement` dans le worktree de reference (jamais l'arbre principal de l'utilisateur). */
  async function checkBase(): Promise<{ reason: string | null; proof?: Proof }> {
    return baseLock.run(async () => { // le worktree de reference ne bouge pas pendant la suite
      const dir = await ensureBase();
      if (!dir) return { reason: "worktree de reference indisponible (creation ou npm ci)" };
      const [t, c] = await suiteLock.run(() => Promise.all([run("npm", ["test"], dir), run("npx", ["tsc", "--noEmit"], dir)]));
      if (c.code !== 0) return { reason: `npx tsc --noEmit failed: ${failureDigest(c.out)}` };
      if (t.code !== 0) return { reason: `npm test failed: ${failureDigest(t.out)}` };
      return { reason: null, proof: { tests: { ok: true, count: testCount(t.out), scope: "full" }, tsc: { ok: true } } };
    });
  }

  const suiteLock = createMutex({ name: "suiteLock", onLock }); // une suite a la fois: 3 agents qui lancent vitest ensemble provoquent des timeouts
  /** Tests + tsc. Test deja rouge sur la base (verifiee en worktree isole) tolere (`preexisting`) seulement s'il n'est lie a aucun fichier modifie. */
  async function checks(dir: string): Promise<{ reason: string | null; preexisting?: string[]; proof?: Proof; kind?: "tsc" | "tests"; failed?: string[] }> {
    const [t, c] = await suiteLock.run(() => Promise.all([run("npm", ["test"], dir), run("npx", ["tsc", "--noEmit"], dir)]));
    if (c.code !== 0) return { reason: `npx tsc --noEmit failed: ${failureDigest(c.out)}`, kind: "tsc" };
    const proof: Proof = { tests: { ok: true, count: testCount(t.out), scope: "full" }, tsc: { ok: true } };
    if (t.code === 0) return { reason: null, proof };
    const mine = failedTests(t.out);
    const base = mine.length ? await baseFailures(failedFiles(mine)) : null;
    if (!base) return { reason: `npm test failed: ${failureDigest(t.out)}`, kind: "tests", failed: mine };
    const added = onlyOnBranch(mine, base);
    if (added.length) return { reason: `npm test failed (introduit par la branche): ${added.join("; ")}\n${failureDigest(t.out)}`, kind: "tests", failed: added };
    const changed = (await git(["diff", "--name-only", `${DEV}...HEAD`], dir)).out.split(/\r?\n/).filter(Boolean);
    const linked = relatedFailures(mine, changed);
    return linked.length ? { reason: `npm test failed (deja rouge sur la base mais lie aux fichiers modifies par la carte): ${linked.join("; ")}`, kind: "tests", failed: linked } : { reason: null, preexisting: mine, proof };
  }

  /** Retire le worktree de reference (fin du run). */
  async function dispose() {
    const d = baseDir; baseDir = null;
    if (d) await git(["worktree", "remove", "--force", d]);
  }

  return { checks, checkBase, dispose };
}
