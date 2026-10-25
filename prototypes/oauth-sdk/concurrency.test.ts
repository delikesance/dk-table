/** Verrou FIFO et reserve de travailleurs: ordre, concurrence maximale, erreurs, arret. */
import { describe, expect, it } from "vitest";
import { createMutex, runPool } from "./concurrency";
import { deferred, flush } from "./testUtil";

describe("createMutex", () => {
  it("serialise les sections critiques, dans l'ordre d'arrivee", async () => {
    const m = createMutex();
    const log: string[] = [];
    const gate = deferred(); // "a" reste dans sa section tant que la porte est fermee: b et c ne peuvent pas doubler
    const task = (id: string, wait?: Promise<void>) => m.run(async () => { log.push(`+${id}`); await wait; log.push(`-${id}`); return id; });
    const all = Promise.all([task("a", gate.promise), task("b"), task("c")]);
    await flush();
    expect(log).toEqual(["+a"]);
    gate.resolve();
    const r = await all;
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

describe("createMutex: mesure des attentes", () => {
  it("rapporte l'attente avant d'entrer et la duree passee dedans, par nom (horloge simulee)", async () => {
    let t = 0;
    const stats: { name: string; waitMs: number; holdMs: number }[] = [];
    const m = createMutex({ name: "suiteLock", now: () => t, onLock: (s) => stats.push(s) });
    const gate = deferred();
    const a = m.run(async () => { await gate.promise; t += 50; });
    const b = m.run(async () => { t += 10; });
    await flush();
    t += 200; // b attend derriere a
    gate.resolve();
    await Promise.all([a, b]);
    expect(stats[0]).toEqual({ name: "suiteLock", waitMs: 0, holdMs: 250 });
    expect(stats[1]).toMatchObject({ name: "suiteLock", waitMs: 250, holdMs: 10 });
  });
  it("un rappel de mesure qui leve ne casse pas le verrou", async () => {
    const m = createMutex({ onLock: () => { throw new Error("log"); } });
    await expect(m.run(async () => 1)).resolves.toBe(1);
    await expect(m.run(async () => 2)).resolves.toBe(2);
  });
});

describe("runPool", () => {
  it("jamais plus de n travailleurs a la fois, tous les elements traites, resultats dans l'ordre", async () => {
    let now = 0, peak = 0;
    const r = await runPool([1, 2, 3, 4, 5, 6, 7], 3, async (x) => { peak = Math.max(peak, ++now); await flush(); now--; return x * 2; });
    expect(r).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBe(3);
  });
  it("n = 1: strictement en serie", async () => {
    let now = 0, peak = 0;
    await runPool([1, 2, 3], 1, async () => { peak = Math.max(peak, ++now); await flush(); now--; });
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
