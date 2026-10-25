// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderAudit } from "./audit";
import type { Finding } from "../../engine/model/audit";

const f = (kind: Finding["kind"], key: string): Finding => ({ kind, sheetId: "s1", sheet: "Ventes", key, message: "m " + key });

describe("renderAudit", () => {
  it("groups findings by kind with a count and navigates on click", () => {
    const el = document.createElement("div"), go = vi.fn();
    const list = [f("cycle", "A1"), f("constant", "B1"), f("constant", "B2")];
    renderAudit(el, list, go);
    expect(el.querySelectorAll("h3").length).toBe(2);
    expect(el.querySelectorAll("[data-finding]").length).toBe(3);
    el.querySelector<HTMLElement>('[data-finding="2"]')!.click();
    expect(go).toHaveBeenCalledWith(list[2]);
  });
  it("shows an all-clear message", () => {
    const el = document.createElement("div");
    renderAudit(el, [], () => {});
    expect(el.textContent).toContain("Aucun problème");
  });
});
