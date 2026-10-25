// @vitest-environment jsdom
/** markKind : classe dkg-long + infobulle pour un identifiant long. */
import { describe, it, expect } from "vitest";
import { markKind } from "./cellkind";

describe("markKind long", () => {
  it("pose dkg-long et l'infobulle", () => {
    const el = document.createElement("div");
    markKind(el, "12345678901234567890", undefined, "long");
    expect(el.classList.contains("dkg-long")).toBe(true);
    expect(el.title).toContain("Identifiant long");
    markKind(el, "12", undefined, "number");
    expect(el.classList.contains("dkg-long")).toBe(false);
  });
});
