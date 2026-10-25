/** Debut de run : reprise d'un etat interrompu ou etat neuf, puis nettoyage sur des worktrees orphelins. */
import { describe, expect, it } from "vitest";
import type { Run } from "./git";
import { beginRun } from "./resume";
import { createFileStateStore } from "./runState";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const store = () => createFileStateStore(join(mkdtempSync(join(tmpdir(), "rs-")), "state.json"));
const listing = (dirs: string[]) => dirs.map((d, i) => `worktree ${d}\nHEAD abc\nbranch refs/heads/wt/c${i}\n`).join("\n");
function fakeRun(dirs: string[]) {
  const calls: string[] = [];
  const run: Run = async (_c, args) => {
    calls.push(args.join(" "));
    if (args[0] === "worktree" && args[1] === "list") return { code: 0, out: listing(dirs) };
    return { code: 0, out: "" };
  };
  return { run, calls };
}

describe("beginRun", () => {
  it("run precedent termine: etat neuf, aucun essai repris, orphelins nettoyes", async () => {
    const st = store();
    st.update((s) => { s.finished = true; s.cards.a = { tries: 2, models: [] }; });
    const { run, calls } = fakeRun(["/r/.claude/worktrees/x"]);
    const r = await beginRun({ state: st, run, cwd: "/r", dev: "developpement", runId: "r2" });
    expect(r.resumed).toBe(false);
    expect(st.load()).toMatchObject({ runId: "r2", cards: {}, finished: false });
    expect(calls).toContain("worktree remove --force /r/.claude/worktrees/x");
  });
  it("run interrompu: etat repris, worktrees des cartes a reprendre gardes", async () => {
    const st = store();
    st.update((s) => { s.finished = false; s.runId = "r1"; s.cards.a = { tries: 1, models: ["haiku"], dir: "/r/.claude/worktrees/keep" }; s.cards.b = { tries: 3, models: [], dir: "/r/.claude/worktrees/dead", deferred: { kind: "max-tries", reason: "x" } }; });
    const { run, calls } = fakeRun(["/r/.claude/worktrees/keep", "/r/.claude/worktrees/dead"]);
    const r = await beginRun({ state: st, run, cwd: "/r", dev: "developpement", runId: "r2" });
    expect(r.resumed).toBe(true);
    expect(st.load().cards.a.tries).toBe(1);
    expect(calls).not.toContain("worktree remove --force /r/.claude/worktrees/keep");
    expect(calls).toContain("worktree remove --force /r/.claude/worktrees/dead");
  });
  it("sans magasin d'etat: ne fait rien", async () => {
    const { run, calls } = fakeRun([]);
    expect(await beginRun({ run, cwd: "/r", dev: "d", runId: "x" })).toEqual({ resumed: false, swept: [] });
    expect(calls).toEqual([]);
  });
});
