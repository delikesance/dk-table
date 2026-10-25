/** Tests of the git flow with a fake runner (no real git). */
import { describe, it, expect } from "vitest";
import { createGitFlow, type Run } from "./git";

type Call = { cmd: string; args: string[]; cwd?: string };

/** Fake runner: records calls; `reply` maps "cmd args" prefixes to results. */
function fake(reply: Record<string, { code: number; out?: string }> = {}) {
  const calls: Call[] = [];
  const run: Run = async (cmd, args, cwd) => {
    calls.push({ cmd, args, cwd });
    const line = `${cmd} ${args.join(" ")}`;
    const key = Object.keys(reply).find((k) => line.startsWith(k));
    const r = key ? reply[key] : { code: 0 };
    return { code: r.code, out: r.out ?? "" };
  };
  const lines = () => calls.map((c) => `${c.cmd} ${c.args.join(" ")}`);
  return { run, calls, lines };
}

describe("ensureDev", () => {
  it("creates developpement when missing, without checkout", async () => {
    const f = fake({ "git rev-parse --verify developpement": { code: 1 } });
    await createGitFlow(f.run, "/r").ensureDev();
    expect(f.lines()).toContain("git branch developpement");
    expect(f.lines().some((l) => l.startsWith("git checkout"))).toBe(false);
  });
  it("does nothing when present", async () => {
    const f = fake();
    await createGitFlow(f.run, "/r").ensureDev();
    expect(f.lines().some((l) => l.startsWith("git branch "))).toBe(false);
  });
});

describe("startSector", () => {
  it("adds a worktree on wt/<sector>-<ts> from developpement", async () => {
    const f = fake();
    const r = await createGitFlow(f.run, "/r").startSector("auth");
    expect(r.branch).toMatch(/^wt\/auth-\d+$/);
    expect(f.lines()).toContain(`git worktree add -b ${r.branch} ${r.dir} developpement`);
  });
});

describe("commit", () => {
  it("skips when nothing to commit", async () => {
    const f = fake({ "git status": { code: 0, out: "" } });
    expect(await createGitFlow(f.run, "/r").commit("/d", "m")).toBe(false);
    expect(f.lines().some((l) => l.startsWith("git commit"))).toBe(false);
  });
  it("commits with the trailer in dir", async () => {
    const f = fake({ "git status": { code: 0, out: " M a.ts\n" } });
    expect(await createGitFlow(f.run, "/r").commit("/d", "msg")).toBe(true);
    const c = f.calls.find((x) => x.args[0] === "commit")!;
    expect(c.cwd).toBe("/d");
    expect(c.args.join("\n")).toContain("Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>");
  });
});

describe("mergeIfGreen", () => {
  it("merges --no-ff into developpement and removes worktree when green", async () => {
    const f = fake({ "git rev-parse --abbrev-ref": { code: 0, out: "developpement\n" } });
    const r = await createGitFlow(f.run, "/r").mergeIfGreen("wt/a-1", "/d");
    expect(r.merged).toBe(true);
    const l = f.lines();
    expect(l).toContain("git merge --no-ff wt/a-1");
    expect(l).toContain("git worktree remove --force /d");
  });
  it("red tests: no merge, branch left", async () => {
    const f = fake({ "npm test": { code: 1, out: "boom" } });
    const r = await createGitFlow(f.run, "/r").mergeIfGreen("wt/a-1", "/d");
    expect(r.merged).toBe(false);
    expect(r.reason).toContain("npm test");
    expect(f.lines().some((l) => l.startsWith("git merge"))).toBe(false);
    expect(f.lines().some((l) => l.startsWith("git worktree remove"))).toBe(false);
  });
  it("red tsc: no merge", async () => {
    const f = fake({ "npx tsc": { code: 2 } });
    const r = await createGitFlow(f.run, "/r").mergeIfGreen("wt/a-1", "/d");
    expect(r.merged).toBe(false);
    expect(f.lines().some((l) => l.startsWith("git merge"))).toBe(false);
  });
  it("conflict: aborts merge", async () => {
    const f = fake({
      "git rev-parse --abbrev-ref": { code: 0, out: "developpement" },
      "git merge --no-ff": { code: 1, out: "conflict" },
    });
    const r = await createGitFlow(f.run, "/r").mergeIfGreen("wt/a-1", "/d");
    expect(r.merged).toBe(false);
    expect(f.lines()).toContain("git merge --abort");
  });
});

describe("safety", () => {
  it("never pushes nor touches master/main", async () => {
    const f = fake({ "git rev-parse --verify": { code: 1 }, "git status": { code: 0, out: "x" } });
    const g = createGitFlow(f.run, "/r");
    await g.ensureDev();
    const s = await g.startSector("x");
    await g.commit(s.dir, "m");
    await g.mergeIfGreen(s.branch, s.dir);
    for (const l of f.lines()) {
      expect(l).not.toMatch(/\bpush\b/);
      expect(l).not.toMatch(/(checkout|switch|merge)\b.*\b(master|main)\b/);
    }
  });
  it("no merge when developpement cannot be checked out", async () => {
    const f = fake({ "git rev-parse --abbrev-ref": { code: 0, out: "master" }, "git checkout": { code: 1 } });
    const r = await createGitFlow(f.run, "/r").mergeIfGreen("wt/a-1", "/d");
    expect(r.merged).toBe(false);
    expect(f.lines().some((l) => l.startsWith("git merge"))).toBe(false);
  });
});
