// @vitest-environment jsdom
/** Dialogue « Tableau croisé » : disposition par défaut, création d'une nouvelle feuille. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openPivot, gridOf, cellsOf } from "./pivot";
import type { App } from "../appTypes";

const raw = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { raw: v }]));
const CELLS = raw({ A1: "Region", B1: "Qte", A2: "Nord", B2: "2", A3: "Sud", B3: "5", A4: "Nord", B4: "1" });

beforeEach(() => { document.body.innerHTML = ""; });

describe("pivot dialog helpers", () => {
  it("gridOf lit la zone utilisée, cellsOf réécrit en clés A1", () => {
    expect(gridOf(CELLS)).toEqual([["Region", "Qte"], ["Nord", "2"], ["Sud", "5"], ["Nord", "1"]]);
    expect(cellsOf([["a", ""], ["", "b"]])).toEqual({ A1: { raw: "a" }, B2: { raw: "b" } });
  });
});

describe("openPivot", () => {
  it("préremplit la disposition par défaut et crée une feuille", () => {
    const importSheet = vi.fn();
    const app = { activeDoc: () => ({ cells: CELLS }), importSheet } as unknown as App;
    openPivot(app);
    const sel = (n: string) => document.querySelector<HTMLSelectElement>(`select[name="${n}"]`)!;
    expect(sel("row").value).toBe("Region");
    expect(sel("value").value).toBe("Qte");
    expect(sel("agg").value).toBe("SUM");
    document.querySelector<HTMLButtonElement>('[data-action="create"]')!.click();
    expect(importSheet).toHaveBeenCalledOnce();
    const [name, sheet] = importSheet.mock.calls[0];
    expect(name).toBe("Croisé");
    expect(sheet.cells.A1.raw).toBe("Region");
    expect(sheet.cells.B2.raw).toBe("3");
    expect(document.querySelector(".dk-dialog")).toBeNull();
  });
  it("sans données : message, pas de création", () => {
    const app = { activeDoc: () => ({ cells: {} }), importSheet: vi.fn() } as unknown as App;
    openPivot(app);
    expect(document.querySelector(".dk-dialog")!.textContent).toContain("Aucune donnée");
  });
});
