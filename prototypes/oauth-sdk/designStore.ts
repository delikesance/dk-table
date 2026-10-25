/**
 * Magasin des designs: union du dossier du secteur actif, de l'arbre principal et de la ref
 * `developpement` (git ls-tree / git show via `Run`), sans doublon de nom (actif > principal > git).
 * Pourquoi : pouvoir revoir tous les designs passes meme quand aucun run n'est actif.
 * Usage : `createDesignStore({ cwd, run, activeDir })` -> `{ list, read }` (branche sur `/designs`).
 */
import { join } from "node:path";
import { kindOf, listDesigns, readDesign, safe, type DesignFile } from "./designs";
import type { Run } from "./git";

/** Dependances du magasin. */
export interface DesignStoreOpts {
  /** Racine du depot (arbre principal). */
  cwd: string;
  run: Run;
  /** Dossier docs/design du secteur en cours (null hors run). */
  activeDir: () => string | null;
  /** Ref git contenant les designs fusionnes (defaut: developpement). */
  ref?: string;
}

const REL = "docs/design";

/** Date UTC lue dans `[recap-]<date>-<HHmmss>.html`; undefined pour les anciens noms. */
export function stampMs(name: string): number | undefined {
  const m = /^(?:recap-)?(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})\.html$/.exec(name);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : undefined;
}

/** Fichiers de la ref (taille via `ls-tree -l`, date du nom ou du dernier commit); [] si git echoue. */
async function listRef(run: Run, cwd: string, ref: string): Promise<DesignFile[]> {
  const t = await run("git", ["ls-tree", "-l", ref, `${REL}/`], cwd);
  if (t.code !== 0) return [];
  const log = await run("git", ["log", "-1", "--format=%ct", ref, "--", REL], cwd);
  const commitMs = log.code === 0 ? Number(log.out.trim()) * 1000 || 0 : 0;
  const out: DesignFile[] = [];
  for (const line of t.out.split("\n")) {
    const m = /^\d+ blob \w+\s+(\d+)\t(.+)$/.exec(line.trim());
    const name = m?.[2].split("/").pop() ?? "";
    if (m && safe(name)) out.push({ name, bytes: Number(m[1]), mtimeMs: stampMs(name) ?? commitMs, state: "ecrit", kind: kindOf(name) });
  }
  return out;
}

/** Cree le magasin (lecture seule). */
export function createDesignStore(o: DesignStoreOpts) {
  const ref = o.ref ?? "developpement";
  const mainDir = join(o.cwd, REL);
  return {
    /** Tous les designs connus, dedoublonnes par nom, du plus recent au plus ancien. */
    async list(): Promise<DesignFile[]> {
      const active = o.activeDir();
      const groups = [active ? await listDesigns(active) : [], await listDesigns(mainDir), await listRef(o.run, o.cwd, ref)];
      const byName = new Map<string, DesignFile>();
      for (const f of groups.flat()) if (!byName.has(f.name)) byName.set(f.name, { ...f, mtimeMs: stampMs(f.name) ?? f.mtimeMs });
      return [...byName.values()].sort((a, b) => b.mtimeMs - a.mtimeMs || (a.name < b.name ? 1 : -1));
    },
    /** Contenu d'un design (actif, puis principal, puis ref); null si nom invalide ou introuvable. */
    async read(name: string): Promise<string | null> {
      if (!safe(name)) return null;
      const active = o.activeDir();
      const local = (active ? await readDesign(active, name) : null) ?? (await readDesign(mainDir, name));
      if (local !== null) return local;
      const r = await o.run("git", ["show", `${ref}:${REL}/${name}`], o.cwd);
      return r.code === 0 ? r.out : null;
    },
  };
}
