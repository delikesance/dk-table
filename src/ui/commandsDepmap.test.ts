// @vitest-environment jsdom
/** La commande de palette « Qui utilise cette cellule ? » ouvre le panneau de dépendances. */
import { describe, expect, it } from "vitest";
import { mount } from "./app";
import { defaultRegistry } from "./palette/registry";

describe("commande data.depmap", () => {
  it("ouvre le panneau et liste les dépendants de la cellule active", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const app = mount(document.getElementById("app")!);
    app.edit("A1", "5"); app.edit("B1", "=A1*2");
    app.select("A1");
    defaultRegistry.list().find((c) => c.id === "data.depmap")!.run();
    const links = [...document.querySelectorAll(".dk-dep__link")].map((b) => b.textContent);
    expect(links.some((t) => t?.endsWith("!B1"))).toBe(true);
  });
});
