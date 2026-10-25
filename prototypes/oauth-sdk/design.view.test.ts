// @vitest-environment jsdom
/** Tests de design.html : timeline, iframe sandbox, suivi du dernier design. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(join(__dirname, "design.html"), "utf8");
const DATA = {
  files: [
    { name: "a.html", bytes: 10, mtimeMs: 1000, state: "ecrit" },
    { name: "b.html", bytes: 20, mtimeMs: 2000, state: "mis-a-jour" },
  ],
  steps: [
    { type: "start", sector: "design" },
    { type: "file", sector: "design", message: "a.html" },
    { type: "end", sector: "design", ok: false, costUsd: 0.5 },
  ],
};

/** Charge la page dans jsdom avec fetch/EventSource factices. */
async function load(data: unknown) {
  const g = globalThis as Record<string, unknown>;
  g.fetch = async () => ({ ok: true, json: async () => data });
  g.EventSource = class { addEventListener() {} };
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/i, "");
  const code = [...document.querySelectorAll("script")].map((s) => s.textContent).join("\n");
  new Function(code)();
  await new Promise((r) => setTimeout(r, 10));
}

describe("design.html", () => {
  it("<= 200 lignes, theme sombre, ids stables", () => {
    expect(html.split("\n").length).toBeLessThanOrEqual(200);
    expect(html).toContain("prefers-color-scheme: dark");
    for (const id of ["timeline", "viewer", "thumbs"]) expect(html).toContain(`id="${id}"`);
  });
  it("timeline: étapes, badges texte, échec", async () => {
    await load(DATA);
    expect(document.querySelectorAll("#timeline .step").length).toBe(3);
    const t = document.getElementById("timeline")!.textContent!;
    expect(t).toContain("écrit");
    expect(t).toContain("échec");
    expect(t).toContain("0.50");
    expect(document.querySelector("#timeline .badge")!.textContent).toBe("écrit");
  });
  it("iframe sandbox sans script sur le dernier design", async () => {
    await load(DATA);
    const f = document.querySelector("#viewer iframe") as HTMLIFrameElement;
    expect(f.getAttribute("src")).toBe("/designs/b.html");
    expect(f.hasAttribute("sandbox")).toBe(true);
    expect(f.getAttribute("sandbox")).not.toContain("allow-scripts");
  });
  it("miniatures: choisir fige le suivi", async () => {
    await load(DATA);
    const th = document.querySelectorAll("#thumbs .thumb");
    expect(th.length).toBe(2);
    (th[0] as HTMLElement).click();
    expect(document.querySelector("#viewer iframe")!.getAttribute("src")).toBe("/designs/a.html");
    expect(document.querySelector("#thumbs .thumb.sel")!.getAttribute("aria-current")).toBe("true");
  });
  it("etat vide", async () => {
    await load({ files: [], steps: [] });
    expect(document.querySelectorAll("#viewer .empty").length).toBe(1);
  });
});
