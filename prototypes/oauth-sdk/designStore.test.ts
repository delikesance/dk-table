/** Tests de designStore.ts : union dossier actif + arbre principal + ref `developpement` (Run factice). */
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDesignStore, stampMs } from "./designStore";
import type { Run } from "./git";

const roots: string[] = [];
function setup() {
  const root = mkdtempSync(join(tmpdir(), "dstore-")); roots.push(root);
  const main = join(root, "docs", "design"); mkdirSync(main, { recursive: true });
  const live = join(root, "live"); mkdirSync(live);
  return { root, main, live };
}
afterEach(() => { for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true }); });

/** Run factice : `ls-tree` liste `tree`, `show` renvoie le contenu, `log` une date de commit. */
function fakeRun(tree: Record<string, string>) {
  const calls: string[][] = [];
  const run: Run = async (_cmd, args) => {
    calls.push(args);
    if (args[0] === "ls-tree") {
      const out = Object.entries(tree).map(([n, c]) => `100644 blob abc123 ${String(c.length).padStart(7)}\tdocs/design/${n}`);
      return { code: 0, out: out.join("\n") + "\n" };
    }
    if (args[0] === "show") {
      const n = args[1].replace("developpement:docs/design/", "");
      return n in tree ? { code: 0, out: tree[n] } : { code: 128, out: "fatal" };
    }
    if (args[0] === "log") return { code: 0, out: "1700000000\n" };
    return { code: 1, out: "" };
  };
  return { run, calls };
}

describe("stampMs", () => {
  it("lit <date>-<HHmmss> (UTC) dans le nom, recap- compris", () => {
    const ms = Date.UTC(2026, 9, 25, 10, 30, 5);
    expect(stampMs("2026-10-25-103005.html")).toBe(ms);
    expect(stampMs("recap-2026-10-25-103005.html")).toBe(ms);
    expect(stampMs("2026-10-25.html")).toBeUndefined();
  });
});

describe("createDesignStore", () => {
  it("union dedoublonnee par nom (actif > principal > git), recent d'abord, avec kind", async () => {
    const { root, main, live } = setup();
    writeFileSync(join(main, "2026-10-24-090000.html"), "main");
    writeFileSync(join(main, "recap-2026-10-24-090000.html"), "r");
    writeFileSync(join(live, "2026-10-25-100000.html"), "live!");
    writeFileSync(join(main, "2026-10-25-100000.html"), "old copy");
    utimesSync(join(main, "2026-10-24-090000.html"), 100, 100);
    const { run } = fakeRun({ "2026-10-23-080000.html": "gitgit", "2026-10-24-090000.html": "dup", "2026-10-22.html": "ancien" });
    const store = createDesignStore({ cwd: root, run, activeDir: () => live });
    const l = await store.list();
    expect(l.map((f) => f.name)).toEqual([
      "2026-10-25-100000.html", "recap-2026-10-24-090000.html", "2026-10-24-090000.html", "2026-10-23-080000.html", "2026-10-22.html",
    ]);
    expect(l[0]).toMatchObject({ name: "2026-10-25-100000.html", kind: "design", bytes: 5 });
    expect(l.find((f) => f.name.startsWith("recap-"))).toMatchObject({ kind: "recap" });
    expect(l.filter((f) => f.name === "2026-10-24-090000.html")).toHaveLength(1);
    const git = l.find((f) => f.name === "2026-10-23-080000.html")!;
    expect(git).toMatchObject({ bytes: 6, kind: "design", mtimeMs: Date.UTC(2026, 9, 23, 8) });
    expect(l.find((f) => f.name === "2026-10-22.html")!.mtimeMs).toBe(1700000000 * 1000);
    expect(l.map((f) => f.mtimeMs)).toEqual([...l.map((f) => f.mtimeMs)].sort((a, b) => b - a));
  });
  it("sans git (Run en echec) ni dossier actif: arbre principal seul", async () => {
    const { root, main } = setup();
    writeFileSync(join(main, "a.html"), "A");
    const store = createDesignStore({ cwd: root, run: async () => ({ code: 128, out: "" }), activeDir: () => null });
    expect((await store.list()).map((f) => f.name)).toEqual(["a.html"]);
  });
  it("read: actif d'abord, puis principal, puis git show; noms invalides => null sans appel git", async () => {
    const { root, main, live } = setup();
    writeFileSync(join(live, "a.html"), "LIVE"); writeFileSync(join(main, "a.html"), "MAIN");
    writeFileSync(join(main, "b.html"), "B");
    const { run, calls } = fakeRun({ "c.html": "GIT" });
    const store = createDesignStore({ cwd: root, run, activeDir: () => live });
    expect(await store.read("a.html")).toBe("LIVE");
    expect(await store.read("b.html")).toBe("B");
    expect(await store.read("c.html")).toBe("GIT");
    expect(await store.read("zz.html")).toBeNull();
    const before = calls.length;
    for (const bad of ["../a.html", "a/b.html", "..\\a.html", "a.txt", "x.html:y"]) expect(await store.read(bad)).toBeNull();
    expect(calls.length).toBe(before);
  });
});
