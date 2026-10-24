// @vitest-environment jsdom
/** DOM rendering of the text color via paintStyle. */
import { describe, expect, it } from "vitest";
import { paintStyle } from "./cellview";

describe("paintStyle color", () => {
  it("sets and clears inline color", () => {
    const host = document.createElement("div");
    host.innerHTML = '<div class="dkg-cell" data-key="A1"></div>';
    const el = host.firstElementChild as HTMLElement;
    paintStyle(host, "A1", { color: "#c00" });
    expect(el.style.color).toBe("rgb(204, 0, 0)");
    paintStyle(host, "A1", { color: undefined });
    expect(el.style.color).toBe("");
    paintStyle(host, "A1", {});
    expect(el.style.color).toBe("");
  });
});

describe("ink on fills", () => {
  it("a fill without text color gets a contrasting ink; an explicit color wins", async () => {
    const { paintCell } = await import("./cellview");
    const el = document.createElement("div");
    paintCell(el, { fill: "#fde2e0" });
    expect(el.style.color).toBe("rgb(0, 0, 242)");
    paintCell(el, {}, { fill: "#0000f2" });
    expect(el.style.color).toBe("rgb(242, 242, 242)");
    paintCell(el, { fill: "#0000f2", color: "#a8201a" });
    expect(el.style.color).toBe("rgb(168, 32, 26)");
    paintCell(el, {});
    expect(el.style.color).toBe("");
  });
});
