// @vitest-environment node
/** Tests des routes /designs, /designs/<nom> et /design.html du serveur de la boucle. */
import { afterEach, describe, expect, it } from "vitest";
import { request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createServer, listen, type BoucleEvent, type Deps } from "./server";

const servers: Server[] = [];
afterEach(() => { servers.splice(0).forEach((s) => s.close()); });

const steps: BoucleEvent[] = [{ type: "start", sector: "design" }];
const designs: NonNullable<Deps["designs"]> = {
  list: async () => [{ name: "d.html", bytes: 3, mtimeMs: 1, state: "ecrit", kind: "design" }],
  read: async (n) => (n === "d.html" ? "<h1>d</h1>" : null),
  steps: () => steps,
};

async function boot(extra: Partial<Deps> = {}) {
  const server = createServer({
    runPipeline: async () => {}, parseBudgetEur: () => 1, panelHtml: "p", ...extra,
  });
  servers.push(server);
  await listen(server, 0);
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

describe("designs", () => {
  it("GET /designs => {files, steps}", async () => {
    const { base } = await boot({ designs });
    expect(await (await fetch(base + "/designs")).json()).toEqual({ files: await designs.list(), steps });
  });
  it("GET /designs/<nom> => HTML sandbox; absent => 404", async () => {
    const { base } = await boot({ designs });
    const r = await fetch(base + "/designs/d.html");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-security-policy")).toBe("sandbox");
    expect(r.headers.get("content-type")).toContain("text/html");
    expect(await r.text()).toBe("<h1>d</h1>");
    expect((await fetch(base + "/designs/x.html")).status).toBe(404);
    expect((await fetch(base + "/designs/..%2Fx.html")).status).toBe(404);
  });
  it("sans dependance: /designs => 404", async () => {
    const { base } = await boot();
    expect((await fetch(base + "/designs")).status).toBe(404);
    expect((await fetch(base + "/design.html")).status).toBe(404);
  });
  it("GET /design.html relit la page a chaque requete", async () => {
    let v = "v1";
    const { base } = await boot({ designHtml: () => v });
    expect(await (await fetch(base + "/design.html")).text()).toBe("v1");
    v = "v2";
    expect(await (await fetch(base + "/design.html")).text()).toBe("v2");
  });
  it("hote non loopback => 403", async () => {
    const { server } = await boot({ designs });
    const port = (server.address() as AddressInfo).port;
    const status = await new Promise<number>((resolve) => {
      request({ host: "127.0.0.1", port, path: "/designs", headers: { host: "evil.example.com" } },
        (r) => { r.resume(); resolve(r.statusCode!); }).end();
    });
    expect(status).toBe(403);
  });
});
