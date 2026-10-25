// @vitest-environment jsdom
/** La commande de palette « Audit de modèle » ouvre le panneau et liste les constats. */
import { describe, expect, it } from "vitest";
import { mount } from "./app";
import { defaultRegistry } from "./palette/registry";

describe("commande data.audit", () => {
  it("signale une constante codée en dur", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const app = mount(document.getElementById("app")!);
    app.edit("A1", "5"); app.edit("B1", "=A1*1.2");
    defaultRegistry.list().find((c) => c.id === "data.audit")!.run();
    const links = [...document.querySelectorAll(".dk-audit__link")].map((b) => b.textContent);
    expect(links.some((t) => t?.includes("B1"))).toBe(true);
  });
});
