// @vitest-environment jsdom
/** Poignée de recopie: repérage dans le coin bas-droit de la sélection, glisser (aperçu), relâcher, double-clic. */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { createGrid, type Grid } from "./grid";

let host: HTMLElement;
let raw: Record<string, string>;
let onEdit: Mock<(key: string, raw: string) => void>;
let grid: Grid;
const cell = (k: string) => host.querySelector(`[data-key="${k}"]`) as HTMLElement;
/** Place the handle hit zone: the cell's bottom-right corner is at (100,100). */
const rect = (el: HTMLElement) => { el.getBoundingClientRect = () => ({ left: 60, top: 80, right: 100, bottom: 100, width: 40, height: 20, x: 60, y: 80, toJSON() {} }); };
const onHandle = { clientX: 97, clientY: 97 };
const ev = (el: Element, type: string, init: MouseEventInit = {}) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }));

beforeEach(() => {
  host = document.createElement("div");
  document.body.replaceChildren(host);
  raw = { A1: "1", A2: "2", A3: "3", B1: "x", A5: "" };
  onEdit = vi.fn((k: string, v: string) => { raw[k] = v; });
  grid = createGrid(host, { cols: 5, rows: 20, getDisplay: (k) => raw[k] ?? "", getRaw: (k) => raw[k] ?? "", onEdit });
});

describe("poignée de recopie", () => {
  it("la cellule en bas à droite de la sélection porte la poignée", () => {
    grid.select("A1:A3");
    expect(cell("A3").classList.contains("dkg-h")).toBe(true);
    expect(host.querySelectorAll(".dkg-h").length).toBe(1);
  });
  it("glisser la poignée sur A6 prolonge 1,2,3 et étend la sélection", () => {
    grid.select("A1:A3");
    rect(cell("A3"));
    ev(cell("A3"), "mousedown", onHandle);
    ev(cell("A6"), "mousemove");
    expect(host.querySelectorAll(".dkg-fp").length).toBe(3); // aperçu A4:A6
    ev(document.body, "mouseup");
    expect(onEdit.mock.calls).toEqual([["A4", "4"], ["A5", "5"], ["A6", "6"]]);
    expect(grid.getSelection()).toBe("A1:A6");
    expect(host.querySelectorAll(".dkg-fp").length).toBe(0);
  });
  it("un clic hors du coin n'est pas la poignée: la sélection change normalement", () => {
    grid.select("A1:A3");
    rect(cell("A3"));
    ev(cell("A3"), "mousedown", { clientX: 70, clientY: 85 });
    ev(document.body, "mouseup");
    expect(grid.getSelection()).toBe("A3");
  });
  it("Ctrl au relâchement inverse: un nombre seul passe en série", () => {
    grid.select("A1");
    rect(cell("A1"));
    ev(cell("A1"), "mousedown", onHandle);
    ev(cell("A3"), "mousemove");
    ev(document.body, "mouseup", { ctrlKey: true });
    expect(onEdit.mock.calls).toEqual([["A2", "2"], ["A3", "3"]]);
  });
  it("double-clic: descend jusqu'à la fin des données voisines", () => {
    raw = { A1: "1", B1: "a", B2: "b", B3: "c", B4: "d" };
    grid.select("A1");
    rect(cell("A1"));
    ev(cell("A1"), "dblclick", onHandle);
    expect(onEdit.mock.calls.map((c) => c[0])).toEqual(["A2", "A3", "A4"]);
    expect(host.querySelector(".dkg-editor")).toBeNull(); // pas d'édition de cellule
  });
});
