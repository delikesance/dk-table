/**
 * Lecture en couches des fichiers du depot : worktree actif, arbre principal, ref `developpement`.
 *
 * Quoi : `read(rel, order)` et `exists(rel, order)`. `live` (defaut) voit le travail en cours
 *        (worktree d'abord) ; `merged` ne voit que ce qui est fusionne (ref d'abord, puis arbre principal).
 * Pourquoi : le board montre les rapports en direct, la boucle ne compte une carte terminee qu'une
 *        fois fusionnee. Chemins relatifs sans `..`; lecture seule.
 * Usage : `createFiles({ cwd, run, activeDir })` -> `{ read, exists }`.
 */
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Run } from "./git";

/** `live`: worktree actif > principal > ref. `merged`: ref > principal. */
export type Order = "live" | "merged";

/** Dependances. */
export interface FilesOpts { cwd: string; run: Run; activeDir: () => string | null; /** Worktrees des agents en parallele (en plus de `activeDir`). */ activeDirs?: () => string[]; ref?: string }

/** Chemin relatif sur: ni absolu, ni `..`. */
const safeRel = (p: string) => !!p && !p.startsWith("/") && !p.split(/[\\/]/).includes("..") && !/^[a-zA-Z]:/.test(p);

/** Cree la lecture en couches. */
export function createFiles(o: FilesOpts) {
  const ref = o.ref ?? "developpement";
  const fromDir = (dir: string | null, rel: string) => dir ? readFile(join(dir, rel), "utf-8").catch(() => null) : Promise.resolve(null);
  const fromRef = async (rel: string) => {
    const r = await o.run("git", ["show", `${ref}:${rel}`], o.cwd);
    return r.code === 0 ? r.out : null;
  };
  const dirExists = (dir: string | null, rel: string) => dir ? stat(join(dir, rel)).then((s) => s.isFile(), () => false) : Promise.resolve(false);
  const refExists = async (rel: string) => (await o.run("git", ["cat-file", "-e", `${ref}:${rel}`], o.cwd)).code === 0;
  /** Worktrees actifs: le dernier demarre d'abord, puis les autres agents. */
  const actives = () => [o.activeDir(), ...(o.activeDirs?.() ?? [])].filter((d, i, l): d is string => !!d && l.indexOf(d) === i);
  return {
    /** Contenu texte, `null` si absent ou chemin refuse. */
    async read(rel: string, order: Order = "live"): Promise<string | null> {
      if (!safeRel(rel)) return null;
      const steps = order === "live"
        ? [...actives().map((d) => () => fromDir(d, rel)), () => fromDir(o.cwd, rel), () => fromRef(rel)]
        : [() => fromRef(rel), () => fromDir(o.cwd, rel)];
      for (const s of steps) { const v = await s(); if (v !== null) return v; }
      return null;
    },
    /** Vrai si le fichier existe dans les memes couches. */
    async exists(rel: string, order: Order = "live"): Promise<boolean> {
      if (!safeRel(rel)) return false;
      if (order === "merged") return (await refExists(rel)) || dirExists(o.cwd, rel);
      for (const d of actives()) if (await dirExists(d, rel)) return true;
      return (await dirExists(o.cwd, rel)) || refExists(rel);
    },
  };
}
