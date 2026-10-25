/**
 * Surveillance des rapports d'agents (`docs/rapports/<id>.md`) pour pousser l'etat des cartes en direct.
 *
 * Quoi : `scanReports(dir, seen)` rend les ids nouveaux ou modifies (mtime); `watchReports(dir, cb)`
 *        l'appelle sur fs.watch avec anti-rebond, et retombe sur un balayage toutes les 2 s tant que
 *        le dossier n'existe pas encore (il est cree par l'agent).
 * Usage : `const stop = watchReports(join(worktree, "docs/rapports"), (id) => emit(...))`.
 */
import { watch, type FSWatcher } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const NAME = /^([a-z0-9-]+)\.md$/;

/** Ids de rapports nouveaux ou modifies depuis le dernier balayage; [] si le dossier est absent. */
export async function scanReports(dir: string, seen: Map<string, number>): Promise<string[]> {
  let names: string[];
  try { names = await readdir(dir); } catch { return []; }
  const out: string[] = [];
  for (const n of names) {
    const id = NAME.exec(n)?.[1];
    if (!id) continue;
    try {
      const m = (await stat(join(dir, n))).mtimeMs;
      if (seen.get(id) !== m) { seen.set(id, m); out.push(id); }
    } catch { /* disparu entre-temps */ }
  }
  return out;
}

/** Surveille `dir`; renvoie `stop()`. */
export function watchReports(dir: string, onChange: (id: string) => void): () => void {
  const seen = new Map<string, number>();
  let w: FSWatcher | undefined, debounce: ReturnType<typeof setTimeout> | undefined, stopped = false;
  const scan = async () => { for (const id of await scanReports(dir, seen)) if (!stopped) onChange(id); };
  const kick = () => { clearTimeout(debounce); debounce = setTimeout(() => void scan(), 150); };
  const attach = () => {
    if (w || stopped) return;
    try { w = watch(dir, kick); w.on("error", () => { w?.close(); w = undefined; }); } catch { /* dossier absent: balayage */ }
  };
  attach();
  const poll = setInterval(() => { attach(); void scan(); }, 2000);
  return () => { stopped = true; clearTimeout(debounce); clearInterval(poll); w?.close(); };
}
