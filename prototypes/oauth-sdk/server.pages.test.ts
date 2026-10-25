// @vitest-environment node
/** Pages du serveur: 404 HTML pour les navigateurs (JSON pour l'API), assets /panel.css et /panel.js en liste blanche, panneau relu. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createServer, listen, type Deps } from "./server";

const servers: Server[] = [];
const dirs: string[] = [];
afterEach(() => { servers.splice(0).forEach((s) => s.close()); dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })); });

async function boot(extra: Partial<Deps> = {}) {
  const server = createServer({ runPipeline: async () => {}, parseBudgetEur: Number, panelHtml: "<html>panel</html>", ...extra });
  servers.push(server);
  await listen(server, 0);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
const html = { headers: { accept: "text/html,application/xhtml+xml" } };

describe("404", () => {
  it("navigateur: page HTML francaise avec lien vers le panneau; API: JSON", async () => {
    const base = await boot();
    const page = await fetch(base + "/design.html", html);
    expect(page.status).toBe(404);
    expect(page.headers.get("content-type")).toContain("text/html");
    const body = await page.text();
    expect(body).toContain("introuvable");
    expect(body).toContain('href="/"');
    const api = await fetch(base + "/nimporte");
    expect(api.status).toBe(404);
    expect(await api.json()).toEqual({ error: "introuvable" });
    expect((await fetch(base + "/moodboard")).headers.get("content-type")).toContain("json");
  });
});

describe("assets /panel.css et /panel.js", () => {
  it("servis depuis assetsDir, relus a chaque requete, bons types", async () => {
    const d = mkdtempSync(join(tmpdir(), "assets-")); dirs.push(d);
    writeFileSync(join(d, "panel.css"), "a{}"); writeFileSync(join(d, "panel.js"), "1;");
    const base = await boot({ assetsDir: d });
    const css = await fetch(base + "/panel.css?v=1");
    expect([css.status, css.headers.get("content-type"), await css.text()]).toEqual([200, "text/css; charset=utf-8", "a{}"]);
    const js = await fetch(base + "/panel.js");
    expect(js.headers.get("content-type")).toBe("text/javascript; charset=utf-8");
    writeFileSync(join(d, "panel.css"), "b{}");
    expect(await (await fetch(base + "/panel.css")).text()).toBe("b{}");
  });

  it("rien d'autre n'est servi; fichier absent ou pas de assetsDir => 404", async () => {
    const d = mkdtempSync(join(tmpdir(), "assets-")); dirs.push(d);
    writeFileSync(join(d, "secret.ts"), "x"); writeFileSync(join(d, "panel.css"), "a{}");
    const base = await boot({ assetsDir: d });
    for (const p of ["/secret.ts", "/panel.css/../secret.ts", "/server.ts", "/panel.js"]) {
      expect((await fetch(base + p)).status).toBe(404);
    }
    const none = await boot();
    expect((await fetch(none + "/panel.css")).status).toBe(404);
  });

  it("le panneau peut etre une fonction (relu a chaque requete)", async () => {
    let v = "p1";
    const base = await boot({ panelHtml: () => v });
    expect(await (await fetch(base + "/")).text()).toBe("p1");
    v = "p2";
    expect(await (await fetch(base + "/")).text()).toBe("p2");
  });
});
