// @vitest-environment jsdom
/** Dialogue « Comparer » : liste des différences entre le classeur ouvert et un .dktable choisi. */
import { beforeEach, describe, expect, it } from "vitest";
import { openCompare, renderDiff } from "./diff";
import type { App } from "../appTypes";
import type { DktDoc } from "../../io/types";
import { serialize } from "../../io/format";
import { waitFor } from "../../test-wait";

const doc = (cells: Record<string, string>): DktDoc => ({
  version: 1,
  sheets: [{ id: "s1", name: "Feuille 1", cols: 26, rows: 100, cells: Object.fromEntries(Object.entries(cells).map(([k, raw]) => [k, { raw }])) }],
});

beforeEach(() => { document.body.innerHTML = ""; });

describe("renderDiff", () => {
  it("résume par feuille et liste les cellules", () => {
    const el = document.createElement("div");
    renderDiff(el, doc({ A1: "1", A2: "x" }), doc({ A1: "2", B1: "n" }));
    expect(el.textContent).toContain("Feuille 1");
    expect(el.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(el.textContent).toContain("A1");
  });
  it("identiques : message", () => {
    const el = document.createElement("div");
    renderDiff(el, doc({ A1: "1" }), doc({ A1: "1" }));
    expect(el.textContent).toContain("Aucune différence");
  });
});

describe("openCompare", () => {
  it("lit un fichier choisi et affiche le diff", async () => {
    const app = { toDoc: () => doc({ A1: "1" }) } as unknown as App;
    openCompare(app);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File([serialize(doc({ A1: "2" }))], "autre.dktable");
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change"));
    await vi_waitFor(() => document.querySelectorAll("tbody tr").length === 1);
    expect(document.querySelector(".dk-diff")!.textContent).toContain("A1");
  });
});

/** Attend qu'une condition devienne vraie (microtâches du FileReader). */
async function vi_waitFor(cond: () => boolean): Promise<void> {
  for (let i = 0; i < 4000 && !cond(); i++) await new Promise((r) => setTimeout(r, 5)); // plafond 20 s, sans cout si la condition arrive
}
