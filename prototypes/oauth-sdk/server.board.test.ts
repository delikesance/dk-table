// @vitest-environment node
/** Routes du board: rapports en direct, captures, assets du moodboard/design, CSP du canevas, `complete` dans done. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createServer, listen, type Deps } from "./server";

const servers: Server[] = [];
afterEach(() => { servers.splice(0).forEach((s) => s.close()); });
async function boot(extra: Partial<Deps> = {}) {
  const server = createServer({ runPipeline: async () => {}, parseBudgetEur: Number, panelHtml: "p", ...extra });
  servers.push(server);
  await listen(server, 0);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe("GET /reports/<id>", () => {
  it("renvoie le rapport en JSON, 404 si absent, 404 sans dependance", async () => {
    const base = await boot({ report: async (id) => id === "a" ? { id, state: "termine" } : null });
    expect(await (await fetch(base + "/reports/a")).json()).toEqual({ id: "a", state: "termine" });
    expect((await fetch(base + "/reports/zz")).status).toBe(404);
    expect((await boot().then((b) => fetch(b + "/reports/a"))).status).toBe(404);
  });
});

describe("GET /shots/<chemin>", () => {
  it("sert uniquement des images de docs/screenshots", async () => {
    const seen: string[] = [];
    const base = await boot({ shot: async (rel) => { seen.push(rel); return rel.endsWith(".png") ? Buffer.from("PNG") : null; } });
    const ok = await fetch(base + "/shots/docs/screenshots/f/a-clair.png");
    expect([ok.status, ok.headers.get("content-type"), await ok.text()]).toEqual([200, "image/png", "PNG"]);
    expect((await fetch(base + "/shots/docs/screenshots/f/x.txt")).status).toBe(404);
    expect((await fetch(base + "/shots/src/secret.png")).status).toBe(404);
    expect((await fetch(base + "/shots/docs/screenshots/../../x.png")).status).toBe(404);
    expect(seen).toEqual(["docs/screenshots/f/a-clair.png"]);
  });
});

describe("assets des pages", () => {
  it("moodboard-view.css/js et design-view.css/js en liste blanche", async () => {
    const d = mkdtempSync(join(tmpdir(), "as-"));
    for (const f of ["moodboard-view.css", "moodboard-view.js", "design-view.css", "design-view.js"]) writeFileSync(join(d, f), f);
    const base = await boot({ assetsDir: d });
    for (const f of ["moodboard-view.css", "moodboard-view.js", "design-view.css", "design-view.js"]) expect(await (await fetch(`${base}/${f}`)).text()).toBe(f);
    rmSync(d, { recursive: true, force: true });
  });
});

describe("designs", () => {
  it("CSP: scripts en ligne autorises (canevas libre), reseau interdit", async () => {
    const base = await boot({ designs: { list: async () => [], read: async () => "<script>1</script>", steps: () => [] } });
    const csp = (await fetch(base + "/designs/a.html")).headers.get("content-security-policy") ?? "";
    expect(csp).toContain("sandbox allow-scripts");
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'unsafe-inline'");
    expect(csp).not.toMatch(/connect-src|https?:/);
  });
});

describe("done", () => {
  it("transporte `complete` rendu par le pipeline", async () => {
    const base = await boot({ runPipeline: async () => ({ complete: true }) });
    await fetch(base + "/go", { method: "POST", body: "{}" });
    await new Promise((r) => setTimeout(r, 50));
    const txt = await (await fetch(base + "/events")).body!.getReader().read().then((r) => new TextDecoder().decode(r.value));
    expect(txt).toContain('"type":"done"');
    expect(txt).toContain('"complete":true');
  });
});
