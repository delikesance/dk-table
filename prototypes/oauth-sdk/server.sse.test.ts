// @vitest-environment node
/** Flux SSE : chaque evenement porte un identifiant `<run>-<n>`; une reconnexion (Last-Event-ID) ne rejoue que la suite. */
import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createServer, listen, type BoucleEvent, type RunOpts } from "./server";

const servers: Server[] = [];
afterEach(() => { servers.splice(0).forEach((s) => { s.closeAllConnections(); s.close(); }); });

async function boot() {
  const st = { o: undefined as RunOpts | undefined, finish: () => {} };
  const server = createServer({
    runPipeline: (o) => new Promise<void>((res) => { st.o = o; st.finish = res; }),
    parseBudgetEur: Number, panelHtml: "p",
  });
  servers.push(server);
  await listen(server, 0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const go = () => fetch(base + "/go", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ budgetEur: 5 }) });
  return { st, base, go };
}
const ev = (message: string): BoucleEvent => ({ type: "info", message });

/** Lit le flux jusqu'a ce que `until` apparaisse; rend les blocs `id`/`data`. */
async function read(base: string, until: string, lastId?: string) {
  const res = await fetch(base + "/events", { headers: lastId ? { "last-event-id": lastId } : {}, signal: AbortSignal.timeout(3000) });
  const rd = res.body!.getReader();
  let text = "";
  while (!text.includes(until)) text += new TextDecoder().decode((await rd.read()).value);
  await rd.cancel();
  return text.split("\n\n").filter((b) => b.includes("id:")).map((b) => ({ id: /^id: (.+)$/m.exec(b)![1], data: /^data: (.+)$/m.exec(b)![1] }));
}

describe("SSE : identifiants et reprise", () => {
  it("chaque evenement porte un id `<run>-<n>` croissant", async () => {
    const { st, base, go } = await boot();
    await go();
    for (const m of ["a", "b", "c"]) st.o!.onEvent(ev(m));
    const got = await read(base, '"c"');
    expect(got.map((g) => g.id)).toEqual(["1-0", "1-1", "1-2"]);
  });
  it("Last-Event-ID du meme run : seulement les evenements suivants (pas de doublon dans le journal)", async () => {
    const { st, base, go } = await boot();
    await go();
    for (const m of ["a", "b", "c", "d"]) st.o!.onEvent(ev(m));
    const got = await read(base, '"d"', "1-1");
    expect(got.map((g) => g.id)).toEqual(["1-2", "1-3"]);
  });
  it("Last-Event-ID d'un run precedent : rejeu complet du run en cours", async () => {
    const { st, base, go } = await boot();
    await go(); st.o!.onEvent(ev("vieux")); st.finish();
    await new Promise((r) => setTimeout(r, 50));
    await go(); st.o!.onEvent(ev("neuf"));
    const got = await read(base, '"neuf"', "1-5");
    expect(got.map((g) => g.id)).toEqual(["2-0"]);
    expect(got[0].data).toContain("neuf");
  });
});
