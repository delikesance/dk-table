/** Tests de la chaine research -> design -> implementation -> correction (query et git factices, sans cout). */
import { describe, expect, it } from "vitest";
import type { Run } from "./git";
import { createPipeline } from "./pipeline";
import type { QueryFn } from "./research";
import type { BoucleEvent } from "./server";

/** Git/shell factice : enregistre les appels; `redNpm` fait echouer npm test. */
function fakeRun(redNpm = false) {
  const calls: { cmd: string; args: string[]; cwd?: string }[] = [];
  const run: Run = async (cmd, args, cwd) => {
    calls.push({ cmd, args, cwd });
    if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--abbrev-ref") return { code: 0, out: "developpement\n" };
    if (cmd === "git" && args[0] === "status") return { code: 0, out: " M f.ts\n" };
    if (cmd === "npm" && redNpm) return { code: 1, out: "FAIL" };
    return { code: 0, out: "" };
  };
  return { run, calls };
}

/** Query factice : cout `cost` borne par maxBudgetUsd. */
function fakeQuery(cost: number) {
  const q: QueryFn = ({ options }) =>
    (async function* () {
      yield { type: "result", subtype: "success", result: "- a", total_cost_usd: Math.min(cost, options.maxBudgetUsd as number) };
    })();
  return q;
}

async function go(o: { cost?: number; red?: boolean; eur?: number; abort?: boolean }) {
  const { run, calls } = fakeRun(o.red);
  const files: string[] = [];
  const events: BoucleEvent[] = [];
  const ac = new AbortController();
  if (o.abort) ac.abort();
  const pipeline = createPipeline({
    query: fakeQuery(o.cost ?? 0.1), run, cwd: "/repo", eurUsd: 1,
    writeFile: (p) => { files.push(p); },
  });
  await pipeline({ budgetEur: o.eur ?? 20, onEvent: (e) => events.push(e), signal: ac.signal });
  return { calls, files, events };
}

describe("runPipeline", () => {
  it("enchaine les 4 secteurs, ecrit la recherche dans le worktree et fusionne dans developpement", async () => {
    const { calls, files, events } = await go({});
    const ended = events.filter((e) => e.type === "end" && !e.axis).map((e) => e.sector);
    expect(ended).toEqual(["research", "design", "implementation", "correction"]);
    expect(files[0]).toMatch(/\.claude[\\/]+worktrees[\\/]+research-.*docs[\\/]+recherche[\\/]+fonctionnalites\.md$/);
    const merges = calls.filter((c) => c.cmd === "git" && c.args[0] === "merge");
    expect(merges).toHaveLength(4);
    expect(merges[0].args).toContain("--no-ff");
  });

  it("emet un resume par phase (ok=true si fusionnee) et le journalise", async () => {
    const { events } = await go({});
    expect(events.filter((e) => e.type === "end" && !e.axis).every((e) => e.ok === true)).toBe(true);
    const sums = events.filter((e) => e.type === "summary");
    expect(sums.map((e) => e.phase)).toEqual(["research", "design", "implementation", "correction"]);
    expect(sums[0].message).toBeTruthy();
    expect(events.some((e) => e.type === "info" && /^resume: /.test(e.message ?? ""))).toBe(true);
  });

  it("ok=false et resume de repli si les tests sont rouges", async () => {
    const { events } = await go({ red: true, cost: 1000, eur: 10 });
    expect(events.filter((e) => e.type === "end" && !e.axis).every((e) => e.ok === false)).toBe(true);
    expect(events.find((e) => e.type === "summary")?.message).toMatch(/Échec : recherche/);
  });

  it("n'utilise jamais push ni master", async () => {
    const { calls } = await go({});
    const flat = calls.flatMap((c) => c.args);
    expect(flat).not.toContain("push");
    expect(flat).not.toContain("master");
  });

  it("ne fusionne rien si les tests sont rouges et le dit", async () => {
    const { calls, events } = await go({ red: true });
    expect(calls.some((c) => c.args[0] === "merge")).toBe(false);
    expect(events.some((e) => /echec|rouge|failed/i.test(e.message ?? ""))).toBe(true);
  });

  it("partage un seul plafond: cout cumule <= budget", async () => {
    const { events } = await go({ cost: 1000, eur: 10 });
    const sum = events.filter((e) => e.type === "end" && !e.axis).reduce((a, e) => a + (e.costUsd ?? 0), 0);
    expect(sum).toBeLessThanOrEqual(10);
  });

  it("emet start/end par axe de recherche (contrat du panneau), cout par axe sur l'axe, cout de phase sur l'evenement du secteur", async () => {
    const { events } = await go({});
    const ax = events.filter((e) => e.sector === "research" && e.axis);
    for (const t of ["start", "end"]) {
      expect(new Set(ax.filter((e) => e.type === t).map((e) => e.axis)).size).toBe(4); // 4 axes (x tours)
    }
    expect(ax.filter((e) => e.type === "start").every((e) => e.costUsd == null)).toBe(true);
    expect(ax.filter((e) => e.type === "end").every((e) => typeof e.costUsd === "number")).toBe(true);
    const rEnd = events.filter((e) => e.type === "end" && e.sector === "research" && !e.axis);
    expect(rEnd).toHaveLength(1);
    expect(typeof rEnd[0].ok).toBe("boolean");
  });

  it("expose le budget du run (onBudget) puis null a la fin, pour le moodboard", async () => {
    const seen: unknown[] = [];
    const { run } = fakeRun();
    const p = createPipeline({ query: fakeQuery(0.1), run, cwd: "/repo", eurUsd: 1, writeFile: () => {}, onBudget: (b) => seen.push(b) });
    await p({ budgetEur: 20, onEvent: () => {}, signal: new AbortController().signal });
    expect(seen).toHaveLength(2);
    expect((seen[0] as { spent(): number }).spent()).toBeGreaterThan(0);
    expect(seen[1]).toBeNull();
  });

  it("ne demarre aucun secteur si deja abandonne", async () => {
    const { calls, events } = await go({ abort: true });
    expect(calls.some((c) => c.args[0] === "worktree")).toBe(false);
    expect(events.filter((e) => e.type === "start")).toHaveLength(0);
  });
});
