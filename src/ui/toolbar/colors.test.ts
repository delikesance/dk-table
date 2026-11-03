// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createColorPicker, FILL_COLORS, TEXT_COLORS, contrastRatio } from "./colors";

const WHITE = "#ffffff";
const DARK_SURFACE = "#1e1e21";
const INK = "#1d1d1f";

/** Builds a picker with a spy onPick; `sw()` lists its buttons. */
const mk = (kind: "fill" | "text") => {
  const onPick = vi.fn();
  const pop = createColorPicker({ kind, onPick, root: document.body });
  return { pop, onPick, sw: () => [...pop.querySelectorAll<HTMLButtonElement>("button")] };
};
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));

describe("contrastRatio", () => {
  it("black/white = 21, same = 1", () => {
    expect(contrastRatio("#000000", WHITE)).toBeCloseTo(21, 0);
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5);
  });
});

describe("palettes", () => {
  it("10 colors each, FR names", () => {
    expect(FILL_COLORS).toHaveLength(10);
    expect(TEXT_COLORS).toHaveLength(10);
    for (const c of [...FILL_COLORS, ...TEXT_COLORS]) expect(c.name.length).toBeGreaterThan(2);
  });
  it("text colors >=4.5 on white and on every fill", () => {
    for (const t of TEXT_COLORS) {
      expect(contrastRatio(t.value, WHITE), t.name).toBeGreaterThanOrEqual(4.5);
      for (const f of FILL_COLORS) {
        expect(contrastRatio(t.value, f.value), `${t.name}/${f.name}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  it("default ink >=4.5 on every fill; dark-surface text token readable", () => {
    for (const f of FILL_COLORS) expect(contrastRatio(INK, f.value), f.name).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#f2f2f4", DARK_SURFACE)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("color picker", () => {
  it("11 buttons (10 + Aucune), with aria-label", () => {
    const { sw } = mk("fill");
    expect(sw()).toHaveLength(11);
    sw().forEach((b) => expect(b.getAttribute("aria-label")).toBeTruthy());
    expect(sw()[10].getAttribute("aria-label")).toBe("Aucune");
  });
  it("click calls onPick(color) / onPick(null)", () => {
    const { sw, onPick } = mk("text");
    sw()[2].click();
    expect(onPick).toHaveBeenLastCalledWith(TEXT_COLORS[2].value);
    sw()[10].click();
    expect(onPick).toHaveBeenLastCalledWith(null);
  });
  it("arrows move focus, Enter picks, Escape closes", () => {
    const { pop, sw, onPick } = mk("fill");
    sw()[0].focus();
    key(sw()[0], "ArrowRight");
    expect(document.activeElement).toBe(sw()[1]);
    key(sw()[1], "ArrowDown");
    expect(document.activeElement).toBe(sw()[6]);
    key(sw()[6], "ArrowLeft");
    expect(document.activeElement).toBe(sw()[5]);
    key(sw()[5], "Enter");
    expect(onPick).toHaveBeenLastCalledWith(FILL_COLORS[5].value);
    key(sw()[5], "Escape");
    expect(pop.hidden).toBe(true);
  });
  it("setCurrent sets aria-pressed", () => {
    const { pop, sw } = mk("fill");
    pop.setCurrent(FILL_COLORS[3].value);
    expect(sw().filter((b) => b.getAttribute("aria-pressed") === "true")).toEqual([sw()[3]]);
    pop.setCurrent(null);
    expect(sw()[10].getAttribute("aria-pressed")).toBe("true");
  });
});

describe("couleurs personnalisées et du document", () => {
  it("normalizeHex: #rgb -> #rrggbb, minuscules, invalide -> null", async () => {
    const { normalizeHex } = await import("./colors");
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("#FF8800")).toBe("#ff8800");
    expect(normalizeHex("rouge")).toBeNull();
    expect(normalizeHex("")).toBeNull();
  });
  it("extraColors: sans doublon, hors palette, plafonné", async () => {
    const { extraColors } = await import("./colors");
    const used = ["#FDE2E0", "#ff8800", "#F80", "#ff8800", "#123456", "nope"];
    expect(extraColors(used, FILL_COLORS)).toEqual(["#ff8800", "#123456"]);
    expect(extraColors(["#111111", "#222222", "#333333"], FILL_COLORS, 2)).toEqual(["#111111", "#222222"]);
  });
  it("l'entrée couleur personnalisée applique la couleur choisie (à la validation)", () => {
    const { pop, onPick } = mk("fill");
    const input = pop.querySelector<HTMLInputElement>('input[type="color"]')!;
    expect(input.getAttribute("aria-label")).toBe("Couleur personnalisée");
    input.value = "#12ab34";
    input.dispatchEvent(new Event("change"));
    expect(onPick).toHaveBeenLastCalledWith("#12ab34");
  });
  it("les couleurs du document apparaissent à l'ouverture, cliquables, sans toucher aux 11 boutons de la palette", async () => {
    const onPick = vi.fn();
    const pop = createColorPicker({ kind: "fill", onPick, root: document.body, docColors: () => ["#FDE2E0", "#ff8800"] });
    pop.hidden = true;
    pop.hidden = false;
    await new Promise((r) => setTimeout(r, 0)); // MutationObserver
    const doc = [...pop.querySelectorAll<HTMLButtonElement>(".color-doc button")];
    expect(doc.map((b) => b.dataset.color)).toEqual(["#ff8800"]); // #fde2e0 est déjà dans la palette
    doc[0].click();
    expect(onPick).toHaveBeenLastCalledWith("#ff8800");
    pop.setCurrent("#ff8800");
    expect(doc[0].getAttribute("aria-pressed")).toBe("true");
  });
  it("aucune couleur du document: la section reste cachée", () => {
    const { pop } = mk("fill");
    expect(pop.querySelector<HTMLElement>(".color-doc")!.hidden).toBe(true);
  });
});
