// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { mount } from "../ui/app";
import { runMacroOnApp } from "./run";

const cell = (root: HTMLElement, k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;

describe("macro sur l'app", () => {
  it("une macro = un seul pas d'annulation", async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.getElementById("app")!;
    const app = mount(root);
    app.edit("A1", "5");
    // Runner factice (le WASM Lua est testé dans macro.test.ts).
    const r = await runMacroOnApp(app, "", async (_code, api) => {
      api.setCell("B1", String(Number(api.getValue("A1")) * 2));
      api.setCell("B2", "1");
      return { ok: true };
    });
    expect(r.ok).toBe(true);
    expect(cell(root, "B1").textContent).toBe("10");
    app.undo();
    expect(cell(root, "B1").textContent).toBe("");
    expect(cell(root, "B2").textContent).toBe("");
    expect(cell(root, "A1").textContent).toBe("5");
  });
});
