/** Tests de designs.ts : liste, lecture sure et suivi en direct (dossier temporaire reel). */
import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { listDesigns, readDesign, watchDesigns, withStates, type DesignFile } from "./designs";

const dirs: string[] = [];
const tmp = () => { const d = mkdtempSync(join(tmpdir(), "designs-")); dirs.push(d); return d; };
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Attend que `cond` soit vraie (max 4 s). */
async function until(cond: () => boolean) { for (let i = 0; i < 80 && !cond(); i++) await wait(50); }

describe("listDesigns", () => {
  it("liste les .html avec kind (recap-* = recap), plus recent d'abord; dossier absent => []", async () => {
    const d = tmp();
    writeFileSync(join(d, "a.html"), "A"); writeFileSync(join(d, "b.html"), "BB");
    writeFileSync(join(d, "recap-2026-10-25-100000.html"), "R"); utimesSync(join(d, "recap-2026-10-25-100000.html"), 500, 500); writeFileSync(join(d, "n.txt"), "x");
    utimesSync(join(d, "a.html"), 1000, 1000); utimesSync(join(d, "b.html"), 2000, 2000);
    const l = await listDesigns(d);
    expect(l.map((f) => f.name)).toEqual(["b.html", "a.html", "recap-2026-10-25-100000.html"]);
    expect(l.map((f) => f.kind)).toEqual(["design", "design", "recap"]);
    expect(l[0]).toMatchObject({ bytes: 2, state: "ecrit" });
    expect(await listDesigns(join(d, "nope"))).toEqual([]);
  });
});

describe("readDesign", () => {
  it("lit un fichier, refuse traversee/noms invalides, null si absent", async () => {
    const d = tmp(); writeFileSync(join(d, "x.html"), "<p>ok</p>");
    expect(await readDesign(d, "x.html")).toBe("<p>ok</p>");
    expect(await readDesign(d, "../x.html")).toBeNull();
    expect(await readDesign(d, "..\\x.html")).toBeNull();
    expect(await readDesign(d, "a/x.html")).toBeNull();
    expect(await readDesign(d, "x.txt")).toBeNull();
    expect(await readDesign(d, "absent.html")).toBeNull();
  });
});

describe("watchDesigns", () => {
  it("signale ecrit puis mis-a-jour, meme si le dossier n'existe pas encore", async () => {
    const d = tmp(); const sub = join(d, "docs", "design");
    const got: DesignFile[] = [];
    const stop = watchDesigns(sub, (f) => got.push(f));
    await wait(100);
    mkdirSync(sub, { recursive: true });
    writeFileSync(join(sub, "d.html"), "1");
    await until(() => got.length >= 1);
    expect(got[0]).toMatchObject({ name: "d.html", state: "ecrit" });
    writeFileSync(join(sub, "d.html"), "22");
    utimesSync(join(sub, "d.html"), 5000, 5000);
    await until(() => got.length >= 2);
    expect(got[1]).toMatchObject({ name: "d.html", state: "mis-a-jour", bytes: 2 });
    stop();
    const n = got.length;
    writeFileSync(join(sub, "e.html"), "z");
    await wait(400);
    expect(got.length).toBe(n);
  });
});

describe("withStates", () => {
  it("reporte l'etat mis-a-jour des evenements file sur la liste (le fichier seul dit toujours ecrit)", () => {
    const f = (name: string): DesignFile => ({ name, bytes: 1, mtimeMs: 1, state: "ecrit", kind: "design" });
    const out = withStates([f("a.html"), f("b.html")], [
      { type: "file", message: "a.html", state: "ecrit" }, { type: "file", message: "a.html", state: "mis-a-jour" },
      { type: "start", message: "a.html", state: "mis-a-jour" },
    ]);
    expect(out.map((x) => x.state)).toEqual(["mis-a-jour", "ecrit"]);
  });
});
