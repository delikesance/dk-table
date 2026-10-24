// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { createGrid } from "./grid";
import { paintStyle } from "../cellview";

let host: HTMLElement;
const cell = (k: string) => host.querySelector(`[data-key="${k}"]`) as HTMLElement;

beforeEach(() => {
  host = document.createElement("div");
  document.body.replaceChildren(host);
  const raw: Record<string, string> = { A1: "12", B1: "abc", C1: "#DIV/0!", D1: "-1,5" };
  createGrid(host, { cols: 5, rows: 3, getDisplay: (k: string) => raw[k] ?? "", getRaw: (k: string) => raw[k] ?? "", onEdit: () => {}, onSelect: () => {} } as never);
});

describe("grid value-type classes", () => {
  it("numbers get dkg-num", () => {
    expect(cell("A1").classList.contains("dkg-num")).toBe(true);
    expect(cell("D1").classList.contains("dkg-num")).toBe(true);
    expect(cell("B1").classList.contains("dkg-num")).toBe(false);
  });
  it("errors get dkg-err and a French title", () => {
    expect(cell("C1").classList.contains("dkg-err")).toBe(true);
    expect(cell("C1").title).toMatch(/zéro/);
    expect(cell("A1").title).toBe("");
  });
});

describe("paintStyle align", () => {
  it("maps CellStyle.align to justify-content (cells are flex)", () => {
    paintStyle(host, "A1", { align: "left" });
    expect(cell("A1").style.justifyContent).toBe("flex-start");
    paintStyle(host, "A1", { align: "center" });
    expect(cell("A1").style.justifyContent).toBe("center");
    paintStyle(host, "A1", { align: "right" });
    expect(cell("A1").style.justifyContent).toBe("flex-end");
    paintStyle(host, "A1", {});
    expect(cell("A1").style.justifyContent).toBe("");
  });
});
