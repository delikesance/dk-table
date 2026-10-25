// @vitest-environment jsdom
/** Barre de menus quand un document est ouvert : Insertion remplace Feuille et Données, Format agit sur le texte. */
import { describe, expect, it, vi } from "vitest";
import { buildMenuSpec, type MenuDeps } from "./spec";
import type { App } from "../appTypes";

const fakeApp = (doc: boolean) => ({
  undo: vi.fn(), redo: vi.fn(), style: vi.fn(), activeStyle: () => ({}), addSheet: vi.fn(), addDoc: vi.fn(),
  selection: () => "A1", getFreeze: () => ({ rows: 0, cols: 0 }), setFreeze: vi.fn(), toggleSplit: vi.fn(),
  activeDocId: () => (doc ? "d1" : undefined), docFormat: vi.fn(), docInsert: vi.fn(),
}) as unknown as App;
const deps = (): MenuDeps => ({
  file: { onNew: vi.fn(), onOpen: vi.fn(), onSave: vi.fn(), onSaveAs: vi.fn(), onImportCsv: vi.fn(), onExportCsv: vi.fn(), onExportFec: vi.fn() },
  openSettings: vi.fn(), openMacros: vi.fn(), macros: () => [], runMacro: vi.fn(), openPalette: vi.fn(), openAbout: vi.fn(), autosum: vi.fn(), exportDoc: vi.fn(),
});
const items = (spec: ReturnType<typeof buildMenuSpec>, menu: string) => {
  const m = spec.find((d) => d.label === menu)!;
  return typeof m.items === "function" ? m.items() : m.items;
};

describe("menus avec un document ouvert", () => {
  it("Insertion remplace Feuille et Données", () => {
    expect(buildMenuSpec(fakeApp(true), deps()).map((d) => d.label))
      .toEqual(["Fichier", "Édition", "Format", "Insertion", "Scripts", "Affichage", "Aide"]);
  });
  it("aucun libellé en double", () => {
    const spec = buildMenuSpec(fakeApp(true), deps());
    const all = spec.flatMap((d) => items(spec, d.label).map((e) => e.label));
    expect(new Set(all).size).toBe(all.length);
  });
  it("Insertion : cellule liée, tableau lié, barres, tendance", () => {
    const app = fakeApp(true);
    const ins = items(buildMenuSpec(app, deps()), "Insertion");
    ins.forEach((e) => e.run!());
    expect((app.docInsert as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual(["cell", "table", "bar", "trend"]);
  });
  it("Format agit sur le texte du document", () => {
    const app = fakeApp(true);
    const f = items(buildMenuSpec(app, deps()), "Format");
    f.find((e) => e.label === "Gras")!.run!();
    f.find((e) => e.label === "Titre 2")!.run!();
    f.find((e) => e.label === "Liste à puces")!.run!();
    expect((app.docFormat as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual(["strong", "h2", "bullet"]);
    expect(app.style).not.toHaveBeenCalled();
  });
  it("Fichier : Nouveau document, et Exporter le document… (Ctrl+E) seulement avec un document", () => {
    const app = fakeApp(true), d = deps();
    const f = items(buildMenuSpec(app, d), "Fichier");
    f.find((e) => e.label === "Nouveau document")!.run!();
    expect(app.addDoc).toHaveBeenCalled();
    const ex = f.find((e) => e.label === "Exporter le document…")!;
    expect(ex.hint).toBe("Ctrl+E");
    ex.run!();
    expect(d.exportDoc).toHaveBeenCalled();
    const g = items(buildMenuSpec(fakeApp(false), deps()), "Fichier");
    expect(g.some((e) => e.label === "Nouveau document")).toBe(true);
    expect(g.some((e) => e.label === "Exporter le document…")).toBe(false);
  });
  it("Affichage : Vue scindée (Ctrl+\\)", () => {
    const app = fakeApp(true);
    const v = items(buildMenuSpec(app, deps()), "Affichage").find((e) => e.label === "Vue scindée")!;
    expect(v.hint).toBe("Ctrl+\\");
    v.run!();
    expect(app.toggleSplit).toHaveBeenCalled();
  });
});
