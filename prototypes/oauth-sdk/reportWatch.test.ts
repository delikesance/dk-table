// @vitest-environment node
/** Tests de la surveillance des rapports (docs/rapports/*.md). */
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanReports, watchReports } from "./reportWatch";

describe("scanReports", () => {
  it("renvoie les ids nouveaux ou modifies, ignore les autres fichiers", async () => {
    const d = mkdtempSync(join(tmpdir(), "rw-"));
    writeFileSync(join(d, "a.md"), "x"); writeFileSync(join(d, "b.txt"), "x");
    const seen = new Map<string, number>();
    expect(await scanReports(d, seen)).toEqual(["a"]);
    expect(await scanReports(d, seen)).toEqual([]);
    utimesSync(join(d, "a.md"), new Date(), new Date(Date.now() + 5000));
    expect(await scanReports(d, seen)).toEqual(["a"]);
    expect(await scanReports(join(d, "absent"), seen)).toEqual([]);
  });
});

describe("watchReports", () => {
  it("previent quand un rapport apparait, meme si le dossier n'existe pas encore", async () => {
    const root = mkdtempSync(join(tmpdir(), "rw-")), dir = join(root, "docs", "rapports");
    const got: string[] = [];
    const stop = watchReports(dir, (id) => got.push(id));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "z.md"), "# Rapport : Z");
    for (let i = 0; i < 40 && !got.includes("z"); i++) await new Promise((r) => setTimeout(r, 100));
    stop();
    expect(got).toContain("z");
  });
});
