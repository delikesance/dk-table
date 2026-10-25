/** Cartes independantes: pas de fichier en commun annonce, pas de conflit precedent. */
import { describe, expect, it } from "vitest";
import { splitParallel, touches } from "./independent";

const c = (id: string, source = "", title = id) => ({ id, title, source, summary: "" });

describe("touches", () => {
  it("fichiers et dossiers cites dans le titre, la source ou le resume", () => {
    expect([...touches({ ...c("a", "modifier src/engine/sheet.ts et ui/grid/"), summary: "voir docs/x.md" })].sort())
      .toEqual(["docs/x.md", "src/engine/sheet.ts", "ui/grid/"]);
  });
  it("aucun chemin: ensemble vide", () => { expect(touches(c("a", "Formulaire par enregistrement")).size).toBe(0); });
});

describe("splitParallel", () => {
  it("cartes sans chemin commun: toutes en parallele", () => {
    const r = splitParallel([c("a", "src/a.ts"), c("b", "src/b.ts"), c("d")]);
    expect(r.par.map((x) => x.id)).toEqual(["a", "b", "d"]);
    expect(r.ser).toEqual([]);
  });
  it("meme fichier annonce: la 2e passe en serie", () => {
    const r = splitParallel([c("a", "src/engine/sheet.ts"), c("b", "src/engine/sheet.ts"), c("d", "src/ui/x.ts")]);
    expect(r.par.map((x) => x.id)).toEqual(["a", "d"]);
    expect(r.ser.map((x) => x.id)).toEqual(["b"]);
  });
  it("un dossier couvre ses fichiers (src/engine/ recouvre src/engine/sheet.ts)", () => {
    const r = splitParallel([c("a", "src/engine/"), c("b", "src/engine/sheet.ts")]);
    expect(r.ser.map((x) => x.id)).toEqual(["b"]);
  });
  it("carte deja en conflit (avoid): en serie, meme sans chemin", () => {
    const r = splitParallel([c("a"), c("b")], new Set(["b"]));
    expect(r.par.map((x) => x.id)).toEqual(["a"]);
    expect(r.ser.map((x) => x.id)).toEqual(["b"]);
  });
  it("une seule carte: pas de parallelisme utile mais classee en par", () => {
    expect(splitParallel([c("a")]).par).toHaveLength(1);
  });
});
