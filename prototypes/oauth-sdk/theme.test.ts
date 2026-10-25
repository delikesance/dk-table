// @vitest-environment node
/** Theme de la boucle = theme de l'application : memes tokens (src/styles), servis tels quels, clair et sombre. */
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { listen } from "./server";
import { buildBoucleServer } from "./wiring";

const read = (f: string) => readFileSync(join(__dirname, f), "utf8");
const app = (f: string) => readFileSync(join(__dirname, "../../src/styles", f), "utf8");
const PAGES = ["panel.html", "moodboard.html", "design.html"];
const CSS = ["panel.css", "moodboard-view.css", "design-view.css"];
const servers: Server[] = [];
afterEach(() => { servers.splice(0).forEach((s) => s.close()); });

/** Valeurs des tokens `--c-*` d'un bloc (premiere occurrence). */
const tokens = (css: string) => Object.fromEntries([...css.matchAll(/(--c-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe("theme de la boucle", () => {
  it("chaque page charge les tokens de l'app (clair + sombre) puis theme.js, avant panel.css", () => {
    for (const p of PAGES) {
      const h = read(p);
      const order = ["/theme/tokens.css", "/theme/theme-dark.css", "/theme.js", "/panel.css"].map((u) => h.indexOf(u));
      expect(order.every((i) => i >= 0), p).toBe(true);
      expect([...order].sort((a, b) => a - b), p).toEqual(order);
    }
  });
  it("les feuilles de la boucle n'ont aucune couleur en dur (tokens de l'app uniquement)", () => {
    for (const f of CSS) {
      const css = read(f).replace(/\/\*[\s\S]*?\*\//g, "");
      expect([f, (css.match(/#[0-9a-f]{3,8}\b|rgba?\(/gi) ?? []).filter((c) => c !== "#fff")]).toEqual([f, []]); // #fff = fond du design affiche
    }
    expect(read("panel.css")).toContain("var(--c-accent");
    expect(read("panel.css")).toContain("var(--font-display)");
  });
  it("contraste AA des paires texte/fond du panneau, thème clair et sombre", () => {
    const light = tokens(app("tokens.css")), dark = { ...light, ...tokens(app("theme-dark.css")) };
    for (const [name, t] of [["clair", light], ["sombre", dark]] as const) {
      for (const [fg, bg] of [["--c-text", "--c-bg"], ["--c-text", "--c-surface"], ["--c-text-2", "--c-surface"], ["--c-accent", "--c-surface"], ["--c-error", "--c-surface"], ["--c-text-on-solid", "--c-accent-solid"], ["--c-chrome-text", "--c-chrome"]]) {
        expect(ratio(t[fg], t[bg]), `${name} ${fg}/${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  it("le serveur sert tokens.css et theme-dark.css de l'app a l'identique, et theme.js", async () => {
    const server = buildBoucleServer({ query: () => (async function* () {})(), run: async () => ({ code: 0, out: "" }), env: {}, cwd: process.cwd() });
    servers.push(server);
    await listen(server, 0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    expect(await (await fetch(base + "/theme/tokens.css")).text()).toBe(app("tokens.css"));
    expect(await (await fetch(base + "/theme/theme-dark.css")).text()).toBe(app("theme-dark.css"));
    const js = await fetch(base + "/theme.js");
    expect(js.headers.get("content-type")).toContain("javascript");
    expect(await js.text()).toContain("data-theme");
  });
});
