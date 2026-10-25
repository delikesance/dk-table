/**
 * Suivi des maquettes HTML ecrites par le secteur design (docs/design/*.html).
 * Quoi : liste, lecture sure et surveillance (fs.watch + anti-rebond, dossier encore absent toleree).
 * Usage : `watchDesigns(dir, f => ...)` renvoie `stop()`; `readDesign` valide strictement le nom.
 */
import { watch, type FSWatcher } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

/** Fichier de design; `state` = 'ecrit' (1re vue) ou 'mis-a-jour'. */
export interface DesignFile {
  name: string; bytes: number; mtimeMs: number; state: "ecrit" | "mis-a-jour";
  /** `recap` = recap-<date>-<HHmmss>.html (export Canva), `design` = maquette. */
  kind: "design" | "recap";
}

const NAME = /^[\w.-]+\.html$/;

/** Nature d'un fichier selon son nom (recap.html et recap-*.html = recap). */
export const kindOf = (name: string): DesignFile["kind"] => (/^recap[-.]/.test(name) ? "recap" : "design");

/** Etat reel des fichiers: le dernier evenement `file` du nom l'emporte (le disque seul dit « ecrit »). */
export function withStates(
  files: DesignFile[],
  steps: { type: string; message?: string; state?: DesignFile["state"] }[],
): DesignFile[] {
  const last = new Map<string, DesignFile["state"]>();
  for (const s of steps) if (s.type === "file" && s.message && s.state) last.set(s.message, s.state);
  return files.map((f) => ({ ...f, state: last.get(f.name) ?? f.state }));
}

/** Nom de fichier sur: pas de separateur ni de `..`. */
export const safe = (n: string): boolean => NAME.test(n) && !n.includes("..");

/** docs/design/*.html (maquettes et recaps, voir `kind`), le plus recent d'abord; [] si le dossier n'existe pas. */
export async function listDesigns(dir: string): Promise<DesignFile[]> {
  let names: string[];
  try { names = await readdir(dir); } catch { return []; }
  const out: DesignFile[] = [];
  for (const name of names) {
    if (!safe(name)) continue;
    try {
      const s = await stat(join(dir, name));
      if (s.isFile()) out.push({ name, bytes: s.size, mtimeMs: s.mtimeMs, state: "ecrit", kind: kindOf(name) });
    } catch { /* disparu entre-temps */ }
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/** Contenu d'un design, `null` si le nom est invalide ou le fichier absent. */
export async function readDesign(dir: string, name: string): Promise<string | null> {
  if (!safe(name)) return null;
  try { return await readFile(join(dir, name), "utf-8"); } catch { return null; }
}

/** Arret du suivi; `flush()` releve tout de suite ce qui vient d'etre ecrit (sans attendre l'anti-rebond de 150 ms). */
export type DesignWatch = (() => void) & { flush: () => Promise<void> };

/** Surveille `dir` (meme s'il n'existe pas encore); renvoie `stop()` (avec `flush`). */
export function watchDesigns(dir: string, onChange: (f: DesignFile) => void): DesignWatch {
  const seen = new Map<string, number>();
  let watcher: FSWatcher | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const scan = async (): Promise<void> => {
    for (const f of (await listDesigns(dir)).reverse()) {
      if (stopped) return;
      if (f.kind !== "design") continue;
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
  const stop = () => { stopped = true; clearTimeout(debounce); clearTimeout(retry); watcher?.close(); };
  return Object.assign(stop, { flush: () => { clearTimeout(debounce); return scan(); } });
}
