// @vitest-environment jsdom
/** DOM rendering of underline, wrap and borders via paintStyle. */
import { describe, expect, it } from "vitest";
import { paintStyle } from "./cellview";

/** Host with one A1 cell. */
function mk() {
  const host = document.createElement("div");
  host.innerHTML = '<div class="dkg-cell" data-key="A1"></div>';
  return { host, el: host.firstElementChild as HTMLElement };
}

describe("paintStyle underline / wrap / borders", () => {
  it("underline sets and clears text-decoration", () => {
    const { host, el } = mk();
    paintStyle(host, "A1", { underline: true });
    expect(el.style.textDecoration).toBe("underline");
    paintStyle(host, "A1", {});
    expect(el.style.textDecoration).toBe("");
  });
  it("wrap lets text wrap inside the cell", () => {
    const { host, el } = mk();
    paintStyle(host, "A1", { wrap: true });
    expect(el.style.whiteSpace).toBe("normal");
    expect(el.classList.contains("dk-wrap")).toBe(true);
    paintStyle(host, "A1", {});
    expect(el.style.whiteSpace).toBe("");
    expect(el.classList.contains("dk-wrap")).toBe(false);
  });
  it("borders are exposed as data-borders (t/r/b/l letters)", () => {
    const { host, el } = mk();
    paintStyle(host, "A1", { borders: { t: true, l: true } });
    expect(el.dataset.borders).toBe("tl");
    paintStyle(host, "A1", { borders: {} });
    expect(el.hasAttribute("data-borders")).toBe(false);
    paintStyle(host, "A1", { borders: { r: true, b: true } });
    expect(el.dataset.borders).toBe("rb");
    paintStyle(host, "A1", {});
    expect(el.hasAttribute("data-borders")).toBe(false);
  });
});
