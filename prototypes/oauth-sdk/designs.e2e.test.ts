// @vitest-environment node
/** Bout en bout (dossier temporaire reel): un faux secteur design ecrit x.html -> /designs, /designs/x.html (CSP sandbox), recap.html. */
import { waitFor } from "./testUtil";
import { existsSync, mkdirSync, readdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { listDesigns, readDesign, withStates } from "./designs";
import type { Run } from "./git";
import { createPipeline } from "./pipeline";
import { buildRecap } from "./recap";
import type { QueryFn } from "./research";
import { createServer, listen, type BoucleEvent } from "./server";

const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

const run: Run = async (cmd, args) => {
  if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--abbrev-ref") return { code: 0, out: "developpement\n" };
  if (cmd === "git" && args[0] === "status") return { code: 0, out: " M f\n" };
  return { code: 0, out: "" };
};

describe("designs de bout en bout", () => {
  it("liste, sert avec CSP sandbox, puis produit recap.html avec la note Canva", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "e2e-design-")); dirs.push(cwd);
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    let wrote!: () => void;
    const written = new Promise<void>((r) => { wrote = r; });
    const query: QueryFn = ({ prompt, options }) => (async function* () {
      if (prompt.startsWith("Secteur design")) {
        const d = join(options.cwd as string, "docs", "design");
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, "x.html"), "<body><h1>Maquette X</h1><script>alert(1)</script></body>");
        wrote();
        await gate;
      }
      yield { type: "result", subtype: "success", result: "- a", total_cost_usd: 0.01 };
    })();

    let active: string | null = null;
    const steps: BoucleEvent[] = [];
    const pipeline = createPipeline({ query, run, cwd, eurUsd: 1, buildRecap, onSectorDir: (d) => { active = d; } });
    const server = createServer({
      runPipeline: (o) => pipeline({ ...o, onEvent: (e) => { if (e.sector === "design") steps.push(e); o.onEvent(e); } }),
      parseBudgetEur: Number, panelHtml: "p",
      designs: {
        list: async () => withStates(await listDesigns(active ?? ""), steps),
        read: (n) => readDesign(active ?? "", n), steps: () => steps,
      },
    });
    await listen(server, 0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const done = pipeline({ budgetEur: 20, onEvent: (e) => { if (e.sector === "design") steps.push(e); }, signal: new AbortController().signal });
      await written;
      let files: { name: string }[] = [];
      await waitFor(async () => {
        files = ((await (await fetch(base + "/designs")).json()) as { files: { name: string }[] }).files;
        return files.some((f) => f.name === "x.html");
      }, 30_000, "x.html listé");
      expect(files.map((f) => f.name)).toEqual(["x.html"]);
      const r = await fetch(base + "/designs/x.html");
      expect(r.status).toBe(200);
      expect(r.headers.get("content-security-policy") ?? "").toContain("sandbox allow-scripts");
      expect(await r.text()).toContain("Maquette X");
      release();
      await done;
      const recap = join(cwd, ".claude", "worktrees");
      const found = existsSync(recap) ? readdirSync(recap).filter((n) => n.startsWith("design-")) : [];
      expect(found).toHaveLength(1);
      const dd = join(recap, found[0], "docs", "design");
      const html = readFileSync(join(dd, readdirSync(dd).filter((n) => /^recap-\d{4}-\d{2}-\d{2}-\d{6}\.html$/.test(n))[0]), "utf-8");
      expect(html).toContain("Canva");
      expect(html).toContain("Maquette X");
      expect(html).not.toContain("alert(1)");
    } finally {
      release(); server.close();
    }
  });
});
