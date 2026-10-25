/** SSE fiable: chaque evenement a un id et une heure; la reprise (Last-Event-ID) ne rejoue que les manquants, dans l'ordre. */
import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createServer, listen, type BoucleEvent, type RunOpts } from "./server";

const servers: Server[] = [];
afterEach(() => { servers.splice(0).forEach((s) => s.close()); });

async function boot() {
  let o!: RunOpts;
  const server = createServer({ runPipeline: (r) => new Promise<void>((res) => { o = r; r.signal.addEventListener("abort", () => res()); }), parseBudgetEur: () => 5, panelHtml: "" });
  servers.push(server);
  await listen(server, 0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  await fetch(base + "/go", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  return { base, emit: (e: BoucleEvent) => o.onEvent(e) };
}
/** Lit les trames SSE jusqu'a en avoir `n`; renvoie {id, data}. */
async function frames(base: string, n: number, lastId?: string) {
  const res = await fetch(base + "/events", { headers: lastId ? { "last-event-id": lastId } : {}, signal: AbortSignal.timeout(3000) });
  const rd = res.body!.getReader();
  let text = "";
  const out: { id: string; ev: BoucleEvent }[] = [];
  const parse = () => { out.length = 0; for (const f of text.split("\n\n")) { const id = /^id: (.+)$/m.exec(f)?.[1], d = /^data: (.+)$/m.exec(f)?.[1]; if (id && d) out.push({ id, ev: JSON.parse(d) }); } };
  while (parse(), out.length < n) text += new TextDecoder().decode((await rd.read()).value);
  await rd.cancel();
  return out.slice(0, n);
}

describe("SSE: ids, heure, reprise", () => {
  it("chaque evenement porte un id croissant et une heure `ts`", async () => {
    const h = await boot();
    h.emit({ type: "info", message: "1" }); h.emit({ type: "info", message: "2" });
    const f = await frames(h.base, 2);
    expect(f.map((x) => x.ev.message)).toEqual(["1", "2"]);
    expect(new Set(f.map((x) => x.id)).size).toBe(2);
    expect(f.every((x) => typeof x.ev.ts === "number")).toBe(true);
  });
  it("Last-Event-ID: seuls les evenements manques sont rejoues, dans l'ordre", async () => {
    const h = await boot();
    for (const m of ["1", "2", "3"]) h.emit({ type: "info", message: m });
    const all = await frames(h.base, 3);
    h.emit({ type: "info", message: "4" }); h.emit({ type: "info", message: "5" });
    const missed = await frames(h.base, 3, all[0].id);
    expect(missed.map((x) => x.ev.message)).toEqual(["2", "3", "4"]);
    const tail = await frames(h.base, 2, all[2].id);
    expect(tail.map((x) => x.ev.message)).toEqual(["4", "5"]);
  });
  it("id d'un autre run (historique remis a zero par /go): rejeu complet, rien de perdu", async () => {
    const h = await boot();
    h.emit({ type: "info", message: "1" });
    const f = await frames(h.base, 1, "0-99");
    expect(f.map((x) => x.ev.message)).toEqual(["1"]);
  });
});
