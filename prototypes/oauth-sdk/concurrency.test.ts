/** Verrou FIFO et reserve de travailleurs: ordre, concurrence maximale, erreurs, arret. */
import { describe, expect, it } from "vitest";
import { createMutex, runPool } from "./concurrency";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("createMutex", () => {
  it("serialise les sections critiques, dans l'ordre d'arrivee", async () => {
    const m = createMutex();
    const log: string[] = [];
    const task = (id: string, ms: number) => m.run(async () => { log.push(`+${id}`); await sleep(ms); log.push(`-${id}`); return id; });
    const r = await Promise.all([task("a", 20), task("b", 1), task("c", 1)]);
    expect(r).toEqual(["a", "b", "c"]);
    expect(log).toEqual(["+a", "-a", "+b", "-b", "+c", "-c"]);
  });
  it("une erreur libere le verrou et remonte a son appelant seulement", async () => {
    const m = createMutex();
    const bad = m.run(async () => { throw new Error("boom"); });
    const ok = m.run(async () => "ok");
    await expect(bad).rejects.toThrow("boom");
    await expect(ok).resolves.toBe("ok");
  });
});

describe("runPool", () => {
  it("jamais plus de n travailleurs a la fois, tous les elements traites, resultats dans l'ordre", async () => {
    let now = 0, peak = 0;
    const r = await runPool([1, 2, 3, 4, 5, 6, 7], 3, async (x) => { peak = Math.max(peak, ++now); await sleep(5); now--; return x * 2; });
    expect(r).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBe(3);
  });
  it("n = 1: strictement en serie", async () => {
    let now = 0, peak = 0;
    await runPool([1, 2, 3], 1, async () => { peak = Math.max(peak, ++now); await sleep(2); now--; });
    expect(peak).toBe(1);
  });
  it("une erreur d'un element n'arrete pas les autres: resultat undefined pour lui, erreur remontee a onError", async () => {
    const errs: string[] = [];
    const r = await runPool([1, 2, 3], 2, async (x) => { if (x === 2) throw new Error("x2"); return x; }, { onError: (e, x) => errs.push(`${x}:${(e as Error).message}`) });
    expect(r).toEqual([1, undefined, 3]);
    expect(errs).toEqual(["2:x2"]);
  });
  it("stop() vrai: les elements non demarres sont ignores (undefined), ceux en cours finissent", async () => {
    let stop = false;
    const r = await runPool([1, 2, 3, 4], 1, async (x) => { if (x === 2) stop = true; return x; }, { stop: () => stop });
    expect(r).toEqual([1, 2, undefined, undefined]);
  });
});
