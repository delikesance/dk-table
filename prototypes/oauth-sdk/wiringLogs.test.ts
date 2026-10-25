/** Journaux du cablage: run courant ou « hors-run », diagnostic de fin ecrit a cote, source pour /logs. */
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createRunLogs } from "./wiringLogs";

const mk = () => { const cwd = mkdtempSync(join(tmpdir(), "wl-")); return { cwd, rl: createRunLogs({ cwd, env: { BOUCLE_LOG: "debug" } }) }; };
describe("createRunLogs", () => {
  it("avant tout run: journal « hors run » utilisable; startRun en ouvre un nouveau", async () => {
    const { rl } = mk();
    rl.cur().info("x", "hors run");
    const idle = rl.cur().run;
    const l = rl.startRun();
    expect(rl.cur().run).toBe(l.run);
    expect(l.run).not.toBe(idle);
  });
  it("endRun: diagnostic renvoye et ecrit dans <run>.diagnostic.md; le journal courant redevient « hors run »", async () => {
    const { cwd, rl } = mk();
    const l = rl.startRun();
    l.error("agent", "boum", { card: "c1" });
    const t = await rl.endRun();
    expect(t).toContain("Anomalies (1)");
    expect(readFileSync(join(cwd, ".boucle", "logs", l.run + ".diagnostic.md"), "utf8")).toBe(t);
    expect(rl.cur().run).not.toBe(l.run);
  });
  it("« dernier run » ignore le journal hors run, meme plus recent", async () => {
    const { rl } = mk();
    const l = rl.startRun(); l.error("x", "boum");
    await rl.endRun();
    rl.cur().info("x", "bruit apres le run");
    expect(await rl.source.diagnostic()).toContain(l.run);
  });
  it("source: runs (sans les .diagnostic), entries du dernier run par defaut, diagnostic a la demande", async () => {
    const { cwd, rl } = mk();
    const l = rl.startRun(); l.warn("git", "fusion refusee", { card: "c1" });
    await rl.endRun();
    const runs = await rl.source.runs();
    expect(runs).toContain(l.run);
    expect(runs.some((r) => r.includes("diagnostic"))).toBe(false);
    expect((await rl.source.entries(l.run, { card: "c1" })).map((e) => e.msg)).toEqual(["fusion refusee"]);
    expect(await rl.source.diagnostic(l.run)).toContain("Anomalies (1)");
    expect(existsSync(join(cwd, ".boucle", "logs"))).toBe(true);
  });
});
