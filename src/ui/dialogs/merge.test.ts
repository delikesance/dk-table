// @vitest-environment jsdom
/** Dialogue « Fusionner… » : aperçu lecture seule de la fusion à 3 voies. */
import { beforeEach, describe, expect, it } from "vitest";
import { openMerge, renderMerge } from "./merge";
import type { App } from "../appTypes";
import type { DktDoc } from "../../io/types";
import { serialize } from "../../io/format";

const doc = (cells: Record<string, string>): DktDoc => ({
  version: 1,
  sheets: [{ id: "s1", name: "Feuille 1", cols: 26, rows: 100, cells: Object.fromEntries(Object.entries(cells).map(([k, raw]) => [k, { raw }])) }],
});

beforeEach(() => { document.body.innerHTML = ""; });

describe("renderMerge", () => {
  it("affiche le nombre de conflits et le tableau", () => {
    const el = document.createElement("div");
    renderMerge(el, doc({ A1: "1", B1: "a" }), doc({ A1: "2", B1: "a" }), doc({ A1: "3", B1: "b" }));
    expect(el.querySelector(".dk-merge__count")!.textContent).toContain("1 conflit");
    expect(el.querySelectorAll("tr.dk-merge--conflict")).toHaveLength(1);
    expect(el.textContent).toContain("A1");
  });
  it("sans conflit : message", () => {
    const el = document.createElement("div");
    renderMerge(el, doc({ A1: "1" }), doc({ A1: "1" }), doc({ A1: "2" }));
    expect(el.querySelector(".dk-merge__count")!.textContent).toContain("Aucun conflit");
  });
});

describe("openMerge", () => {
  it("attend base et fichier, puis affiche l'aperçu", async () => {
    openMerge({ toDoc: () => doc({ A1: "2" }) } as unknown as App);
    const [base, theirs] = [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')];
    const pick = (i: HTMLInputElement, d: DktDoc): void => {
      Object.defineProperty(i, "files", { value: [new File([serialize(d)], "f.dktable")] });
      i.dispatchEvent(new Event("change"));
    };
    pick(base, doc({ A1: "1" }));
    pick(theirs, doc({ A1: "3" }));
    for (let i = 0; i < 50 && !document.querySelector(".dk-merge__count"); i++) await new Promise((r) => setTimeout(r, 10));
    expect(document.querySelector(".dk-merge__count")!.textContent).toContain("1 conflit");
  });
});
