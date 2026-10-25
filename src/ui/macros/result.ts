/** Text shown after a macro run: printed lines, the error, or "Terminé". */
import type { RunResult } from "../../macros/lua";

/** Output line content of a run result. */
export function resultText(r: RunResult): string {
  return r.error ?? (r.output.length ? r.output.join("\n") : "Terminé");
}
