/** Tests de buildRecap : document HTML imprimable (import Canva). */
import { describe, expect, it } from "vitest";
import { buildRecap, type RecapStep } from "./recap";

const D = [
  { name: "a<b>.html", html: "<body><h1>Un</h1><script>alert(1)</script></body>", mtimeMs: 1 },
  { name: "b.html", html: '<div onclick="x()" onload=\'y()\'>Deux</div>', mtimeMs: 2 },
];
const S: RecapStep[] = [
  { type: "file", sector: "design", message: "b.html", state: "mis-a-jour", ts: 5000 },
  { type: "end", sector: "design", ok: true, costUsd: 0.42 },
];

describe("buildRecap", () => {
  const out = buildRecap(D, S);
  it("@page 16:9 paysage et note Canva", () => {
    expect(out).toContain("@page");
    expect(out).toContain("1920px 1080px");
    expect(out).toContain("Pour Canva : Imprimer → Enregistrer en PDF (1 page = 1 diapositive), puis Canva → Importer un fichier");
  });
  it("une page par section: couverture + designs + étapes", () => {
    expect(out.match(/<section class="page/g)!.length).toBe(4);
  });
  it("échappe les noms et retire scripts et handlers", () => {
    expect(out).toContain("a&lt;b&gt;.html");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
    expect(out).not.toMatch(/onclick|onload/);
    expect(out).toContain("Deux");
  });
  it("liste les étapes avec état et coût", () => {
    expect(out).toContain("Étapes du designer");
    expect(out).toContain("mis à jour");
    expect(out).toContain("0.42");
  });
  it("sans design: couverture + étapes", () => {
    expect(buildRecap([], []).match(/<section class="page/g)!.length).toBe(2);
  });
});
