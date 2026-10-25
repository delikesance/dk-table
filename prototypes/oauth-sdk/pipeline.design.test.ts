/** Tests du suivi du secteur design dans le pipeline : evenements `file`, dossier actif, recap.html. */
import { describe, expect, it } from "vitest";
import type { DesignFile } from "./designs";
import type { Run } from "./git";
import { createPipeline } from "./pipeline";
import type { QueryFn } from "./research";
import type { BoucleEvent } from "./server";

const run: Run = async (cmd, args) => {
  if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--abbrev-ref") return { code: 0, out: "developpement\n" };
  if (cmd === "git" && args[0] === "status") return { code: 0, out: " M f.ts\n" };
  return { code: 0, out: "" };
};
const query: QueryFn = () =>
  (async function* () { yield { type: "result", subtype: "success", result: "- a", total_cost_usd: 0.01 }; })();

async function go() {
  const events: BoucleEvent[] = [];
  const written: Record<string, string> = {};
  const dirs: (string | null)[] = [];
  const stops: string[] = [];
  const file: DesignFile = { name: "d.html", bytes: 1, mtimeMs: 7, state: "ecrit" };
  let recapArgs: { designs: unknown; steps: BoucleEvent[] } | undefined;
  const pipeline = createPipeline({
    query, run, cwd: "/repo", eurUsd: 1,
    writeFile: (p, t) => { written[p] = t; },
    onSectorDir: (d) => dirs.push(d),
    watchDesigns: (dir, cb) => { cb(file); return () => stops.push(dir); },
    listDesigns: async () => [file],
    readDesign: async () => "<h1>d</h1>",
    buildRecap: (designs, steps) => { recapArgs = { designs, steps }; return "<recap/>"; },
  });
  await pipeline({ budgetEur: 20, onEvent: (e) => events.push(e), signal: new AbortController().signal });
  return { events, written, dirs, stops, recapArgs };
}

describe("pipeline design", () => {
  it("emet des evenements file, expose le dossier actif puis null, arrete le watcher", async () => {
    const { events, dirs, stops } = await go();
    expect(events.filter((e) => e.type === "file")).toEqual([{ type: "file", sector: "design", message: "d.html" }]);
    expect(dirs[0]).toMatch(/worktrees[\\/]+design-.*docs[\\/]+design$/);
    expect(dirs.at(-1)).toBeNull();
    expect(stops.length).toBeGreaterThanOrEqual(1);
  });
  it("ecrit docs/design/recap.html dans le worktree avec designs et etapes", async () => {
    const { written, recapArgs } = await go();
    const key = Object.keys(written).find((k) => /design-.*docs[\\/]+design[\\/]+recap\.html$/.test(k));
    expect(key && written[key]).toBe("<recap/>");
    expect(recapArgs!.designs).toEqual([{ name: "d.html", html: "<h1>d</h1>", mtimeMs: 7 }]);
    expect(recapArgs!.steps.some((e) => e.type === "start" && e.sector === "design")).toBe(true);
  });
});
