/**
 * Recap HTML du design du run (ecrit dans le worktree du design avant le commit).
 *
 * Quoi : lit les designs du dossier `ddir` (celui de CE run, sinon tous), construit le recap (`recap.ts`) et l'ecrit.
 * Usage : `await writeDesignRecap({ ddir, steps, build, write, list, read })`.
 */
import { basename, join } from "node:path";
import type { DesignFile } from "./designs";
import { currentDesignPath, recapPath } from "./sectors";
import type { BoucleEvent } from "./server";

/** Dependances (injectables pour les tests). */
export interface RecapDeps {
  ddir: string;
  steps: BoucleEvent[];
  build: (designs: { name: string; html: string; mtimeMs: number }[], steps: BoucleEvent[]) => string;
  write: (path: string, text: string) => void;
  list: (dir: string) => Promise<DesignFile[]>;
  read: (dir: string, name: string) => Promise<string | null>;
}

/** Ecrit `recap-<date>-<HHmmss>.html` a cote du design du run (les precedents restent dans leurs propres fichiers). */
export async function writeDesignRecap(d: RecapDeps): Promise<void> {
  const all = (await d.list(d.ddir)).filter((f) => f.kind === "design");
  const mine = all.filter((f) => f.name === basename(currentDesignPath()));
  const designs = [];
  for (const f of mine.length ? mine : all) designs.push({ name: f.name, html: (await d.read(d.ddir, f.name)) ?? "", mtimeMs: f.mtimeMs });
  d.write(join(d.ddir, basename(recapPath(currentDesignPath()))), d.build(designs, d.steps));
}
