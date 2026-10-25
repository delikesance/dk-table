/**
 * Suivi des maquettes HTML ecrites par le secteur design (docs/design/*.html).
 * Quoi : liste, lecture sure et surveillance (fs.watch + anti-rebond, dossier encore absent toleree).
 * Usage : `watchDesigns(dir, f => ...)` renvoie `stop()`; `readDesign` valide strictement le nom.
 */
import { watch, type FSWatcher } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

/** Fichier de design; `state` = 'ecrit' (1re vue) ou 'mis-a-jour'. */
export interface DesignFile { name: string; bytes: number; mtimeMs: number; state: "ecrit" | "mis-a-jour" }

const NAME = /^[\w.-]+\.html$/;
const RECAP = "recap.html";

/** Nom de fichier sur: pas de separateur ni de `..`. */
const safe = (n: string): boolean => NAME.test(n) && !n.includes("..");

/** docs/design/*.html (hors recap.html), le plus recent d'abord; [] si le dossier n'existe pas. */
export async function listDesigns(dir: string): Promise<DesignFile[]> {
  let names: string[];
  try { names = await readdir(dir); } catch { return []; }
  const out: DesignFile[] = [];
  for (const name of names) {
    if (!safe(name) || name === RECAP) continue;
    try {
      const s = await stat(join(dir, name));
      if (s.isFile()) out.push({ name, bytes: s.size, mtimeMs: s.mtimeMs, state: "ecrit" });
    } catch { /* disparu entre-temps */ }
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/** Contenu d'un design, `null` si le nom est invalide ou le fichier absent. */
export async function readDesign(dir: string, name: string): Promise<string | null> {
  if (!safe(name)) return null;
  try { return await readFile(join(dir, name), "utf-8"); } catch { return null; }
}

/** Surveille `dir` (meme s'il n'existe pas encore); renvoie `stop()`. */
export function watchDesigns(dir: string, onChange: (f: DesignFile) => void): () => void {
  const seen = new Map<string, number>();
  let watcher: FSWatcher | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const scan = async (): Promise<void> => {
    for (const f of (await listDesigns(dir)).reverse()) {
      if (stopped) return;
      const prev = seen.get(f.name);
      if (prev === f.mtimeMs) continue;
      seen.set(f.name, f.mtimeMs);
      onChange({ ...f, state: prev === undefined ? "ecrit" : "mis-a-jour" });
    }
  };
  const kick = (): void => { clearTimeout(debounce); debounce = setTimeout(() => void scan(), 150); };
  const attach = (): void => {
    if (stopped) return;
    try {
      watcher = watch(dir, kick);
      watcher.on("error", () => { watcher?.close(); watcher = undefined; retry = setTimeout(attach, 500); });
      kick();
    } catch { retry = setTimeout(attach, 500); }
  };
  attach();
  return () => { stopped = true; clearTimeout(debounce); clearTimeout(retry); watcher?.close(); };
}
