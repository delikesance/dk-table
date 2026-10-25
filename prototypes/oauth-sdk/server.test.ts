// @vitest-environment node
/** Tests du serveur du panneau "boucle" (pipeline factice). */
import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { request } from "node:http";
import { createServer, listen, type BoucleEvent, type Deps, type RunOpts } from "./server";

const servers: Server[] = [];
afterEach(() => { servers.splice(0).forEach((s) => s.close()); });

/** Pipeline factice: émet un `start`, attend l'abandon ou `release`, puis `done`. */
function fake() {
  const st = { opts: undefined as RunOpts | undefined, release: () => {} };
  const runPipeline = (o: RunOpts) => new Promise<void>((res) => {
    st.opts = o;
    o.onEvent({ type: "start", sector: "S1", axis: "A1" });
    st.release = res;
    o.signal.addEventListener("abort", () => res());
  });
  return { st, runPipeline };
}

async function boot(runPipeline = fake().runPipeline, extra: Partial<Deps> = {}) {
  const server = createServer({
    runPipeline,
    parseBudgetEur: (v) => { const n = Number(v); if (!(n > 0)) throw new Error("budget"); return n; },
    panelHtml: "<html>panel</html>",
    ...extra,
  });
  servers.push(server);
  await listen(server, 0);
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}
const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("boucle server", () => {
  it("sert le panneau", async () => {
    const { base } = await boot();
    expect(await (await fetch(base + "/")).text()).toContain("panel");
  });
  it("budget invalide => 400", async () => {
    const { base } = await boot();
    expect((await post(base + "/go", { budgetEur: -1 })).status).toBe(400);
  });
  it("double Go => 409", async () => {
    const { base } = await boot();
    expect((await post(base + "/go", { budgetEur: 5 })).status).toBe(200);
    expect((await post(base + "/go", { budgetEur: 5 })).status).toBe(409);
  });
  it("Stop abandonne le signal", async () => {
    const f = fake();
    const { base } = await boot(f.runPipeline);
    await post(base + "/go", { budgetEur: 5 });
    expect((await post(base + "/stop", {})).status).toBe(200);
    expect(f.st.opts!.signal.aborted).toBe(true);
  });
  it("SSE rejoue les événements aux clients tardifs", async () => {
    const f = fake();
    const { base } = await boot(f.runPipeline);
    await post(base + "/go", { budgetEur: 5 });
    f.st.opts!.onEvent({ type: "end", sector: "S1", costUsd: 0.5 } as BoucleEvent);
    const res = await fetch(base + "/events");
    const reader = res.body!.getReader();
    let text = "";
    while (!text.includes('"end"')) text += new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();
    expect(text).toContain('"start"');
    expect(text).toContain('"end"');
  });
  it("hôte non loopback => 403", async () => {
    const { server } = await boot();
    const port = (server.address() as AddressInfo).port;
    const status = await new Promise<number>((resolve) => {
      request({ host: "127.0.0.1", port, path: "/", headers: { host: "evil.example.com" } },
        (r) => { r.resume(); resolve(r.statusCode!); }).end();
    });
    expect(status).toBe(403);
  });
});

describe("moodboard", () => {
  it("la page est relue a chaque requete (fonction)", async () => {
    let v = "v1";
    const { base } = await boot(undefined, { moodboardHtml: () => v });
    expect(await (await fetch(base + "/moodboard.html")).text()).toBe("v1");
    v = "v2";
    expect(await (await fetch(base + "/moodboard.html")).text()).toBe("v2");
  });

  const card = { id: "a", title: "A", status: "found" as const, summary: "s", source: "x" };
  it("GET /moodboard renvoie le JSON, GET /moodboard.html la page", async () => {
    const { base } = await boot(undefined, { moodboard: async () => [card], moodboardHtml: "<html>mood</html>" });
    expect(await (await fetch(base + "/moodboard")).json()).toEqual([card]);
    expect(await (await fetch(base + "/moodboard.html")).text()).toContain("mood");
  });
  it("sans dependances: /moodboard => [] et /moodboard.html => 404", async () => {
    const { base } = await boot();
    const r = await fetch(base + "/moodboard");
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual([]);
    expect((await fetch(base + "/moodboard.html")).status).toBe(404);
  });
  it("moodboard qui echoue => 500 sans fuite", async () => {
    const { base } = await boot(undefined, { moodboard: async () => { throw new Error("secret"); } });
    const r = await fetch(base + "/moodboard");
    expect(r.status).toBe(500);
    expect(await r.text()).not.toContain("secret");
  });
  it("hote non loopback => 403", async () => {
    const { server } = await boot(undefined, { moodboard: async () => [card] });
    const port = (server.address() as AddressInfo).port;
    const status = await new Promise<number>((resolve) => {
      request({ host: "127.0.0.1", port, path: "/moodboard", headers: { host: "evil.example.com" } },
        (r) => { r.resume(); resolve(r.statusCode!); }).end();
    });
    expect(status).toBe(403);
  });
});
