// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { createGrid, type Grid } from "./grid";
import type { GridView } from "./types";

const data: Record<string, string> = { A1: "Nom", A2: "a", A3: "b", A4: "a", A6: "c" };
let host: HTMLElement;
let view: GridView;
let onEdit: Mock<(key: string, raw: string) => void>;
let grid: Grid;
const get = (k: string) => data[k] ?? "";
const mk = () => (grid = createGrid(host, { cols: 3, rows: 8, getDisplay: get, getRaw: get, onEdit, view }));
const cell = (k: string) => host.querySelector(`[data-key="${k}"]`);
const btn = (c: number) => host.querySelectorAll(".dkg-colh")[c].querySelector(".dkg-filter") as HTMLElement;
const pop = () => document.querySelector(".dkg-pop") as HTMLElement | null;
const boxes = () => [...pop()!.querySelectorAll<HTMLInputElement>("input[type=checkbox][data-v]")];
const click = (el: Element) => el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
const pressKey = (k: string, init: KeyboardEventInit = {}) =>
  (host.querySelector(".dkg") as HTMLElement).dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));
/** Open column A's popover, keep only `keep` checked, press OK. */
function filterA(keep: string[]): void {
  click(btn(0));
  boxes().forEach((b) => { b.checked = keep.includes(b.dataset.v!); });
  click(pop()!.querySelector("[data-act=ok]")!);
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.replaceChildren(host);
  view = { widths: {}, filters: {} };
  onEdit = vi.fn();
});

describe("filtre par colonne (UI)", () => {
  it("le bouton ouvre un popover: valeurs distinctes + compte, (Vides)", () => {
    mk();
    click(btn(0));
    const labels = boxes().map((b) => b.dataset.v);
    expect(labels).toEqual(["a", "b", "c", "(Vides)"]);
    expect(pop()!.textContent).toContain("a");
    expect(pop()!.querySelector("[data-v=a]")!.closest("label")!.textContent).toContain("2");
  });
  it("OK masque les lignes non cochées sans les supprimer; numéros conservés", () => {
    mk();
    filterA(["a"]);
    expect(cell("A2")).not.toBeNull();
    expect(cell("A3")).toBeNull();
    expect(host.querySelector(".dkg-rowh:nth-of-type(1)")).not.toBeUndefined();
    const heads = [...host.querySelectorAll(".dkg-rowh")].map((e) => e.textContent);
    expect(heads).toContain("4");
    expect(heads).not.toContain("3");
    expect(data.A3).toBe("b"); // données intactes
    expect(onEdit).not.toHaveBeenCalled();
    expect(pop()).toBeNull();
  });
  it("colonne filtrée: indicateur; « Effacer le filtre » restaure", () => {
    mk();
    filterA(["a"]);
    expect(host.querySelectorAll(".dkg-colh")[0].classList.contains("dkg-filtered")).toBe(true);
    click(btn(0));
    click(pop()!.querySelector("[data-act=clear]")!);
    expect(host.querySelectorAll(".dkg-colh")[0].classList.contains("dkg-filtered")).toBe(false);
    expect(cell("A3")).not.toBeNull();
    expect(view.filters[0]).toBeUndefined();
  });
  it("le filtre est réappliqué depuis la vue à la reconstruction", () => {
    view.filters[0] = ["c"];
    mk();
    expect(cell("A6")).not.toBeNull();
    expect(cell("A2")).toBeNull();
  });
  it("flèches et Ctrl+D sautent les lignes masquées", () => {
    mk();
    filterA(["a", "c"]);                       // visibles: 1(A1), 2, 4, 6
    grid.select("A4");
    pressKey("ArrowDown");
    expect(grid.getSelection()).toBe("A6");
    grid.select("A2:A6");
    pressKey("d", { ctrlKey: true });
    expect(onEdit.mock.calls.map((c) => c[0])).toEqual(["A4", "A6"]);
  });
  it("Échap ferme le popover", () => {
    mk();
    click(btn(0));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(pop()).toBeNull();
  });
  it("destroy ferme le popover", () => {
    mk();
    click(btn(0));
    grid.destroy();
    expect(pop()).toBeNull();
  });
});
