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
