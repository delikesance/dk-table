/** Lecture et filtre des journaux techniques (runs, carte, agent, niveau, composant). */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { filterEntries, listRuns, readRun, type LogEntry } from "./logRead";

const E = (o: Partial<LogEntry>): LogEntry => ({ ts: "2026-01-01T00:00:00.000Z", ms: 0, level: "info", comp: "x", run: "r1", msg: "m", ...o });
describe("logRead", () => {
  const d = mkdtempSync(join(tmpdir(), "lr-"));
  writeFileSync(join(d, "r1.jsonl"), [E({ msg: "a", card: "c1" }), "pas du json", JSON.stringify(E({ msg: "b", level: "error", agent: "c1, c2" }))].map((x) => typeof x === "string" ? x : JSON.stringify(x)).join("\n") + "\n");
  writeFileSync(join(d, "r2.jsonl"), JSON.stringify(E({ run: "r2", msg: "c" })) + "\n");
  it("readRun ignore les lignes illisibles; run inconnu -> []", async () => {
    expect((await readRun(d, "r1")).map((e) => e.msg)).toEqual(["a", "b"]);
    expect(await readRun(d, "zzz")).toEqual([]);
    expect(await readRun(d, "../r1")).toEqual([]);
  });
  it("listRuns: le plus recent d'abord", async () => {
    expect((await listRuns(d)).sort()).toEqual(["r1", "r2"]);
  });
  it("filtre par carte (champ card OU liste agent), niveau minimal, composant, texte, limite (les derniers)", () => {
    const es = [E({ msg: "a", card: "c1" }), E({ msg: "b", level: "error", agent: "c1, c2" }), E({ msg: "c", comp: "git", level: "warn" })];
    expect(filterEntries(es, { card: "c2" }).map((e) => e.msg)).toEqual(["b"]);
    expect(filterEntries(es, { card: "c1" }).map((e) => e.msg)).toEqual(["a", "b"]);
    expect(filterEntries(es, { level: "warn" }).map((e) => e.msg)).toEqual(["b", "c"]);
    expect(filterEntries(es, { comp: "git" }).map((e) => e.msg)).toEqual(["c"]);
    expect(filterEntries(es, { agent: "c2" }).map((e) => e.msg)).toEqual(["b"]);
    expect(filterEntries(es, { q: "B" }).map((e) => e.msg)).toEqual(["b"]);
    expect(filterEntries(es, { limit: 2 }).map((e) => e.msg)).toEqual(["b", "c"]);
  });
});
