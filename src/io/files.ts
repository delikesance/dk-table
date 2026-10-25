/** Thin Tauri file wrappers (open/save) with injectable dialog + fs for tests. */
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { parse, serialize } from "./format";
import { fromCsv, toCsv, type CsvSheet } from "./csv";
import type { DktDoc, DocSheet } from "./types";

/** Injectable dependencies; defaults are the Tauri plugins. */
export interface IoDeps {
  open: (opts: { multiple: false; filters: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  save: (opts: { filters: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  readTextFile: (path: string) => Promise<string>;
  writeTextFile: (path: string, data: string) => Promise<void>;
}

/** Test-only hook: `globalThis.__DK_IO__` (e.g. set by Playwright) replaces the Tauri plugins when defined. */
const hook = (): IoDeps | undefined => (globalThis as { __DK_IO__?: IoDeps }).__DK_IO__;

export const defaultDeps: IoDeps = {
  open: (o) => (hook()?.open ?? ((x) => open(x) as Promise<string | null>))(o),
  save: (o) => (hook()?.save ?? save)(o),
  readTextFile: (p) => (hook()?.readTextFile ?? readTextFile)(p),
  writeTextFile: (p, d) => (hook()?.writeTextFile ?? writeTextFile)(p, d),
};

const FILTERS = [{ name: "dk-table", extensions: ["dktable"] }];

/** Asks for a file and loads it; null if the user cancels, throws on bad content. */
export async function openDocument(deps: IoDeps = defaultDeps): Promise<{ path: string; doc: DktDoc } | null> {
  const path = await deps.open({ multiple: false, filters: FILTERS });
  if (!path) return null;
  return { path, doc: parse(await deps.readTextFile(path)) };
}

/** Saves to `path`, or asks one when absent. Returns the path, null on cancel. */
export async function saveDocument(doc: DktDoc, path?: string, deps: IoDeps = defaultDeps): Promise<string | null> {
  if (!path) return saveAs(doc, deps);
  await deps.writeTextFile(path, serialize(doc));
  return path;
}

/** Always asks for a destination (adds `.dktable` if missing). Null on cancel. */
export async function saveAs(doc: DktDoc, deps: IoDeps = defaultDeps): Promise<string | null> {
  const chosen = await deps.save({ filters: FILTERS });
  if (!chosen) return null;
  const path = /\.dktable$/i.test(chosen) ? chosen : `${chosen}.dktable`;
  await deps.writeTextFile(path, serialize(doc));
  return path;
}

const CSV_FILTERS = [{ name: "CSV", extensions: ["csv", "txt"] }];

/** Loads a `.dktable` from a known path (recent files). */
export async function openPath(path: string, deps: IoDeps = defaultDeps): Promise<DktDoc> {
  return parse(await deps.readTextFile(path));
}

/** Asks for a CSV file and parses it; null on cancel. */
export async function importCsvFile(deps: IoDeps = defaultDeps): Promise<{ path: string; sheet: CsvSheet } | null> {
  const path = await deps.open({ multiple: false, filters: CSV_FILTERS });
  if (!path) return null;
  return { path, sheet: fromCsv(await deps.readTextFile(path)) };
}

/** Asks for a destination and writes the sheet as CSV (adds `.csv`). Null on cancel. */
export async function exportCsvFile(sheet: DocSheet, deps: IoDeps = defaultDeps): Promise<string | null> {
  const chosen = await deps.save({ filters: CSV_FILTERS });
  if (!chosen) return null;
  const path = /\.(csv|txt)$/i.test(chosen) ? chosen : `${chosen}.csv`;
  await deps.writeTextFile(path, toCsv(sheet));
  return path;
}

const FEC_FILTERS = [{ name: "FEC", extensions: ["txt"] }];

/** Asks for a destination and writes FEC text from `toFec` (adds `.txt`). Null on cancel. */
export async function exportFecFile(text: string, deps: IoDeps = defaultDeps): Promise<string | null> {
  const chosen = await deps.save({ filters: FEC_FILTERS });
  if (!chosen) return null;
  const path = /\.txt$/i.test(chosen) ? chosen : `${chosen}.txt`;
  await deps.writeTextFile(path, text);
  return path;
}
