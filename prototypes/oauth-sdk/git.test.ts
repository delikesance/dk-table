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

describe("commit manquant (Windows : message mal passe a git)", () => {
  it("un commit qui echoue n'est pas fusionne et garde le worktree (le travail n'est pas perdu)", async () => {
    const f = fake({ "git status": { code: 0, out: "?? docs/design/x.html\n" }, "git commit": { code: 1, out: "error: pathspec 'design' did not match" } });
    const g = createGitFlow(f.run, "/r");
    expect(await g.commit("/d", "Boucle: design")).toBe(false);
    const r = await g.mergeIfGreen("wt/a-1", "/d");
    expect(r.merged).toBe(false);
    expect(r.reason).toMatch(/commit/);
    expect(f.lines().some((l) => l.startsWith("git merge") || l.startsWith("git worktree remove"))).toBe(false);
  });
  it("branche sans aucun commit d'avance : pas de fusion « reussie » qui supprimerait le worktree", async () => {
    const f = fake({ "git rev-parse --abbrev-ref": { code: 0, out: "developpement\n" }, "git rev-list --count": { code: 0, out: "0\n" } });
    const r = await createGitFlow(f.run, "/r").mergeIfGreen("wt/a-1", "/d");
    expect(r.merged).toBe(false);
    expect(r.reason).toMatch(/rien/);
    expect(f.lines().some((l) => l.startsWith("git worktree remove"))).toBe(false);
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
  it("raison d'echec lisible: sans ANSI et avec la ligne FAIL, meme loin de la fin", async () => {
    const ESC = String.fromCharCode(27);
    const out = `${ESC}[31m FAIL ${ESC}[39m a.test.ts > cas\nAssertionError: x\n${"bruit\n".repeat(300)}${ESC}[2m Tests ${ESC}[22m 1 failed | 1833 passed (1835)`;
    const f = fake({ "npm test": { code: 1, out } });
    const r = await createGitFlow(f.run, "/r").mergeIfGreen("wt/a-1", "/d");
    expect(r.reason).not.toContain(ESC);
    expect(r.reason).toContain("FAIL  a.test.ts > cas");
    expect(r.reason).toContain("1 failed | 1833 passed");
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

describe("dependencies in the worktree", () => {
  it("runs npm ci in dir after worktree add, before any check", async () => {
    const f = fake();
    const flow = createGitFlow(f.run, "/r");
    const { branch, dir } = await flow.startSector("auth");
    await flow.mergeIfGreen(branch, dir);
    const l = f.lines();
    const ci = l.findIndex((x) => x.startsWith("npm ci"));
    expect(ci).toBeGreaterThan(l.findIndex((x) => x.startsWith("git worktree add")));
    expect(ci).toBeLessThan(l.indexOf("npm test"));
    expect(f.calls[ci].cwd).toBe(dir);
  });
  it("install failure: no checks, no merge, reason returned", async () => {
    const f = fake({ "npm ci": { code: 1, out: "ENOTFOUND" } });
    const flow = createGitFlow(f.run, "/r");
    const { branch, dir } = await flow.startSector("auth");
    const r = await flow.mergeIfGreen(branch, dir);
    expect(r.merged).toBe(false);
    expect(r.reason).toMatch(/npm ci/);
    expect(f.lines().some((x) => x === "npm test" || x.startsWith("git merge"))).toBe(false);
  });
});

describe("mergeIfGreen checks run in parallel", () => {
  it("starts npm test and tsc before either finishes, and reports the first red one", async () => {
    let active = 0, peak = 0;
    const run: Run = async (cmd, args) => {
      if (cmd === "npm" && args[0] === "test" || cmd === "npx") {
        active++; peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 20));
        active--;
        return { code: cmd === "npx" ? 2 : 0, out: "tsc red" };
      }
      return { code: 0, out: "developpement\n" };
    };
    const r = await createGitFlow(run, "/r").mergeIfGreen("wt/x-1", "/r/wt");
    expect(peak).toBe(2);
    expect(r.merged).toBe(false);
    expect(r.reason).toContain("tsc");
  });
});
