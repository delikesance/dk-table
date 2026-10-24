// @vitest-environment jsdom
/** Header context menu (Sheets-like): right-click selects the column/row unless already selected; entries per axis. */
import { describe, expect, it, vi } from "vitest";
import { headerMenu } from "./headerMenu";
import type { App } from "./appTypes";
import type { MenuAction } from "./contextmenu/contextmenu";

const app = (sel: string) => {
  let s = sel;
  return {
    selection: () => s, select: vi.fn((k: string) => { s = k; }), setFreeze: vi.fn(), getFreeze: () => ({ rows: 0, cols: 0 }),
    activeDoc: () => ({ cols: 26, rows: 1000 }), insertCols: vi.fn(), deleteCols: vi.fn(), insertRows: vi.fn(),
    deleteRows: vi.fn(), fitColumns: vi.fn(), sortColumn: vi.fn(), editMany: vi.fn(), selectedKeys: () => ["B1"],
  } as unknown as App & Record<string, ReturnType<typeof vi.fn>>;
};
const head = (cls: string, attr: string, v: number) => {
  const el = document.createElement("div");
  el.className = cls;
  el.dataset[attr] = String(v);
  return el;
};
const labels = (items: ReturnType<typeof headerMenu>) =>
  (items ?? []).filter((i): i is MenuAction => "label" in i).map((i) => i.label);

describe("headerMenu", () => {
  it("returns null outside headers", () => {
    expect(headerMenu(app("A1"), document.createElement("div"))).toBeNull();
  });
  it("column header: selects the column, offers column entries and freeze up to it", () => {
    const a = app("A1");
    const items = headerMenu(a, head("dkg-colh", "col", 2));
    expect(a.select).toHaveBeenCalledWith("C1:C1000");
    expect(labels(items)).toEqual(["Insérer une colonne à gauche", "Supprimer les colonnes", "Trier A→Z", "Trier Z→A",
      "Ajuster à la largeur du contenu", "Figer jusqu'à la colonne C", "Effacer le contenu"]);
  });
  it("keeps a multi-column selection containing the clicked column", () => {
    const a = app("B1:D1000");
    headerMenu(a, head("dkg-colh", "col", 2));
    expect(a.select).not.toHaveBeenCalled();
  });
  it("row header: selects the row, offers row entries", () => {
    const a = app("B2");
    const items = headerMenu(a, head("dkg-rowh", "row", 4));
    expect(a.select).toHaveBeenCalledWith("A5:Z5");
    expect(labels(items)).toEqual(["Insérer une ligne au-dessus", "Supprimer les lignes", "Figer jusqu'à la ligne 5", "Effacer le contenu"]);
  });
});
