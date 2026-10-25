/** Routes /logs et /diagnostic: filtres en requete, JSON et texte, boucle locale seulement. */
import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createServer, listen } from "./server";
import type { LogEntry } from "./logRead";

const servers: Server[] = [];
afterEach(() => { servers.splice(0).forEach((s) => s.close()); });
const E = (o: Partial<LogEntry>): LogEntry => ({ ts: "2026-01-01T00:00:00.000Z", ms: 0, level: "info", comp: "x", run: "r1", msg: "m", ...o });

async function boot() {
  const seen: unknown[] = [];
  const server = createServer({
    runPipeline: async () => {}, parseBudgetEur: () => 5, panelHtml: "",
    logs: {
      runs: async () => ["r2", "r1"],
      entries: async (run, f) => { seen.push({ run, f }); return [E({ run: run ?? "r2", msg: "a" })]; },
      diagnostic: async (run) => `# Diagnostic du run ${run ?? "dernier"}`,
    },
  });
  servers.push(server);
  await listen(server, 0);
  return { base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, seen };
}
describe("routes de logs", () => {
  it("GET /logs: JSON {runs, run, entries}, filtres lus dans la requete", async () => {
    const { base, seen } = await boot();
    const j = await (await fetch(base + "/logs?run=r1&card=c1&agent=a&level=warn&comp=git&q=boum&limit=5")).json();
    expect(j.runs).toEqual(["r2", "r1"]);
    expect(j.entries).toHaveLength(1);
    expect(seen[0]).toEqual({ run: "r1", f: { card: "c1", agent: "a", level: "warn", comp: "git", q: "boum", limit: 5 } });
  });
  it("niveau inconnu ou limite absurde: ignores; run sans parametre = dernier", async () => {
    const { base, seen } = await boot();
    await fetch(base + "/logs?level=zzz&limit=-3");
    expect(seen[0]).toEqual({ run: undefined, f: {} });
  });
  it("GET /diagnostic: texte brut copiable, run au choix", async () => {
    const { base } = await boot();
    const r = await fetch(base + "/diagnostic?run=r1");
    expect(r.headers.get("content-type")).toContain("text/plain");
    expect(await r.text()).toBe("# Diagnostic du run r1");
  });
  it("sans journal branche: 404", async () => {
    const server = createServer({ runPipeline: async () => {}, parseBudgetEur: () => 5, panelHtml: "" });
    servers.push(server); await listen(server, 0);
    expect((await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/logs`)).status).toBe(404);
  });
});
