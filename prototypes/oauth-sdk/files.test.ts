/** Tests de la lecture en couches (worktree actif, arbre principal, ref developpement). */
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFiles } from "./files";
import type { Run } from "./git";

function setup() {
  const main = mkdtempSync(join(tmpdir(), "m-")), act = mkdtempSync(join(tmpdir(), "a-"));
  const refs: Record<string, string> = {};
  const run: Run = async (_c, a) => {
    const key = a[a.length - 1].replace(/^developpement:/, "");
    if (a[0] === "show") return key in refs ? { code: 0, out: refs[key] } : { code: 1, out: "" };
    if (a[0] === "cat-file") return { code: key in refs ? 0 : 1, out: "" };
    return { code: 1, out: "" };
  };
  let dir: string | null = act;
  return { main, act, refs, setDir: (d: string | null) => { dir = d; }, f: createFiles({ cwd: main, run, activeDir: () => dir }) };
}

describe("createFiles", () => {
  it("live: worktree actif avant arbre principal avant ref; merged: ref avant principal", async () => {
    const s = setup();
    mkdirSync(join(s.act, "docs"), { recursive: true }); mkdirSync(join(s.main, "docs"), { recursive: true });
    writeFileSync(join(s.act, "docs/x.md"), "actif"); writeFileSync(join(s.main, "docs/x.md"), "principal");
    s.refs["docs/x.md"] = "ref";
    expect(await s.f.read("docs/x.md")).toBe("actif");
    expect(await s.f.read("docs/x.md", "merged")).toBe("ref");
    s.setDir(null);
    expect(await s.f.read("docs/x.md")).toBe("principal");
    expect(await s.f.read("docs/absent.md")).toBeNull();
  });
  it("exists: fichier du worktree ou de la ref, jamais hors depot", async () => {
    const s = setup();
    writeFileSync(join(s.act, "p.png"), "x"); s.refs["q.png"] = "";
    expect(await s.f.exists("p.png")).toBe(true);
    expect(await s.f.exists("q.png", "merged")).toBe(true);
    expect(await s.f.exists("../etc/passwd")).toBe(false);
    expect(await s.f.exists("p.png", "merged")).toBe(false);
  });
});

describe("plusieurs worktrees actifs (agents en parallele)", () => {
  it("le rapport d'une carte est lu dans le worktree de l'agent qui l'ecrit, quel qu'il soit", async () => {
    const s = setup();
    const a2 = mkdtempSync(join(tmpdir(), "a2-"));
    mkdirSync(join(a2, "docs"), { recursive: true });
    writeFileSync(join(a2, "docs/r.md"), "agent 2");
    const f = createFiles({ cwd: s.main, run: async () => ({ code: 1, out: "" }), activeDir: () => null, activeDirs: () => [s.act, a2] });
    expect(await f.read("docs/r.md")).toBe("agent 2");
    expect(await f.exists("docs/r.md")).toBe(true);
    expect(await f.exists("docs/absent.md")).toBe(false);
  });
});
