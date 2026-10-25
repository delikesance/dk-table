// @vitest-environment node
/** Tests de la surveillance des rapports (docs/rapports/*.md). */
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanReports, watchReports } from "./reportWatch";
import { waitFor } from "./testUtil";

describe("scanReports", () => {
  it("renvoie les ids nouveaux ou modifies, ignore les autres fichiers", async () => {
    const d = mkdtempSync(join(tmpdir(), "rw-"));
    writeFileSync(join(d, "a.md"), "x"); writeFileSync(join(d, "b.txt"), "x");
    const seen = new Map<string, number>();
    expect(await scanReports(d, seen)).toEqual(["a"]);
    expect(await scanReports(d, seen)).toEqual([]);
    utimesSync(join(d, "a.md"), new Date(), new Date(4_000_000_000_000));
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
    await waitFor(() => got.includes("z"), 30_000, "rapport z signale");
    stop();
    expect(got).toContain("z");
  });
});
