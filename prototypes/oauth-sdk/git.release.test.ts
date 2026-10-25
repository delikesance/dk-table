/** `release` : un agent non fusionne ne laisse pas son worktree (npm ci) derriere lui; le travail reste dans la branche. */
import { describe, expect, it } from "vitest";
import { createGitFlow, type Run } from "./git";

function fake(reply: Record<string, { code: number; out?: string }> = {}) {
  const lines: string[] = [];
  const run: Run = async (cmd, args) => {
    const line = `${cmd} ${args.join(" ")}`;
    lines.push(line);
    const key = Object.keys(reply).find((k) => line.startsWith(k));
    return { code: (key ? reply[key] : { code: 0 }).code, out: (key ? reply[key].out : "") ?? "" };
  };
  return { run, lines };
}

describe("release", () => {
  it("retire le worktree et garde la branche quand elle porte du travail", async () => {
    const f = fake({ "git rev-list --count": { code: 0, out: "2\n" } });
    await createGitFlow(f.run, "/r").release("wt/a-1", "/d");
    expect(f.lines).toContain("git worktree remove --force /d");
    expect(f.lines.some((l) => l.startsWith("git branch -D"))).toBe(false);
  });
  it("supprime aussi la branche quand elle est vide (aucun commit d'avance)", async () => {
    const f = fake({ "git rev-list --count": { code: 0, out: "0\n" } });
    await createGitFlow(f.run, "/r").release("wt/a-1", "/d");
    expect(f.lines).toContain("git worktree remove --force /d");
    expect(f.lines).toContain("git branch -D wt/a-1");
  });
  it("commit en echec : le travail n'est que dans le dossier, rien n'est retire", async () => {
    const f = fake({ "git status": { code: 0, out: "?? x\n" }, "git commit": { code: 1, out: "error" } });
    const g = createGitFlow(f.run, "/r");
    await g.commit("/d", "m");
    await g.release("wt/a-1", "/d");
    expect(f.lines.some((l) => l.startsWith("git worktree remove"))).toBe(false);
  });
});
