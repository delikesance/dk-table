/**
 * Commit de documents ecrits par le code dans l'arbre principal (decoupe de cartes: docs/recherche/fonctionnalites.md).
 *
 * Quoi : `createDocs(...)` -> `commitDocs(fichiers, message)`: sous le verrou, sur developpement, ecrit puis commite
 *        (`[boucle-docs]` dans le message: identifiable, jamais reverifie, voir `isMeta`). Echec = fichiers remis tels quels.
 * Usage : `await flow.commitDocs([{ path: "docs/recherche/fonctionnalites.md", text }], "Boucle: decoupe de cartes")`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Mutex } from "./concurrency";

type Git = (args: string[], at?: string) => Promise<{ code: number; out: string }>;

/** Dependances fournies par le flux git. */
export interface DocsDeps { git: Git; lock: Mutex; onDev: () => Promise<boolean>; cwd: string; trailer: string }

/** Construit l'ecrivain de documents; renvoie le hash court du commit, ou `null` (rien ecrit). */
export function createDocs({ git, lock, onDev, cwd, trailer }: DocsDeps) {
  return (files: { path: string; text: string }[], message: string): Promise<string | null> => lock.run(async () => {
    if (!files.length || !(await onDev())) return null;
    const paths = files.map((f) => f.path);
    try {
      for (const f of files) { mkdirSync(dirname(join(cwd, f.path)), { recursive: true }); writeFileSync(join(cwd, f.path), f.text); }
      await git(["add", "--", ...paths]);
      const c = await git(["commit", "-m", `${message} [boucle-docs]`, "-m", "Ecrit par le code (aucune verification supplementaire).", "-m", trailer]);
      if (c.code !== 0) { await git(["reset", "-q", "--", ...paths]); await git(["checkout", "--", ...paths]); return null; }
      return (await git(["rev-parse", "--short", "HEAD"])).out.trim();
    } catch { await git(["checkout", "--", ...paths]); return null; }
  });
}
