/** Save a dk doc export (Markdown / HTML) through the same injectable dialog + fs as the other file actions. */
import { defaultDeps, type IoDeps } from "./files";

const FILTERS = { md: { name: "Markdown", extensions: ["md"] }, html: { name: "HTML", extensions: ["html"] } };

/** Asks for a destination and writes `text` (adds `.md` / `.html`). Null on cancel. */
export async function exportDocFile(kind: "md" | "html", text: string, deps: IoDeps = defaultDeps): Promise<string | null> {
  const chosen = await deps.save({ filters: [FILTERS[kind]] });
  if (!chosen) return null;
  const path = new RegExp(`\\.${kind}$`, "i").test(chosen) ? chosen : `${chosen}.${kind}`;
  await deps.writeTextFile(path, text);
  return path;
}
