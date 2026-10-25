// @vitest-environment jsdom
/** Dialogue « Texte en colonnes » : options, application sur la 1re colonne de la sélection. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyTextToColumns, openTextToColumns } from "./textToCols";
import type { App } from "../appTypes";

const fake = (cells: Record<string, string>, keys: string[]) => {
  const editMany = vi.fn();
  return { app: { editMany, selectedKeys: () => keys, activeDoc: () => ({ cells: Object.fromEntries(Object.entries(cells).map(([k, raw]) => [k, { raw }])) }) } as unknown as App, editMany };
};
beforeEach(() => { document.body.innerHTML = ""; });

describe("textToCols", () => {
  it("applique : écrit les parties à droite", () => {
    const { app, editMany } = fake({ A1: "a;b", A2: "c;d;e" }, ["A1", "A2"]);
    expect(applyTextToColumns(app, { delims: [";"] })).toBe(true);
    expect(editMany).toHaveBeenCalledWith({ A1: "a", B1: "b", A2: "c", B2: "d", C2: "e" });
  });
  it("ne prend que la 1re colonne de la sélection", () => {
    const { app, editMany } = fake({ A1: "a,b", B1: "x,y" }, ["A1", "B1"]);
    applyTextToColumns(app, { delims: [","] });
    expect(editMany).toHaveBeenCalledWith({ A1: "a", B1: "b" });
  });
  it("rien à découper : faux, aucune écriture", () => {
    const { app, editMany } = fake({}, ["A1"]);
    expect(applyTextToColumns(app, { delims: [","] })).toBe(false);
    expect(editMany).not.toHaveBeenCalled();
  });
  it("dialogue : cases virgule/point-virgule/tabulation/espace/autre + Appliquer", () => {
    const { app, editMany } = fake({ A1: "a|b" }, ["A1"]);
    openTextToColumns(app);
    const d = document.querySelector(".dk-dialog")!;
    expect(d.querySelectorAll('input[type="checkbox"][name]').length).toBeGreaterThanOrEqual(5);
    d.querySelector<HTMLInputElement>('input[name="comma"]')!.checked = false;
    d.querySelector<HTMLInputElement>('input[name="other"]')!.value = "|";
    d.querySelector<HTMLButtonElement>('[data-action="apply"]')!.click();
    expect(editMany).toHaveBeenCalledWith({ A1: "a", B1: "b" });
    expect(document.querySelector(".dk-dialog")).toBeNull();
  });
});
