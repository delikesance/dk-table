/** Tests du memo a duree courte (evite de relancer git/lectures a chaque requete du board). */
import { describe, expect, it, vi } from "vitest";
import { memo } from "./memo";

describe("memo", () => {
  it("partage le resultat dans la fenetre, y compris pour des appels simultanes", async () => {
    let n = 0, t = 0;
    const f = memo(async () => ++n, 1000, () => t);
    const [a, b] = await Promise.all([f(), f()]);
    expect([a, b, n]).toEqual([1, 1, 1]);
    t = 999; expect(await f()).toBe(1);
    t = 1001; expect(await f()).toBe(2);
  });
  it("un echec n'est pas memorise", async () => {
    const g = vi.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValue(7);
    const f = memo(g, 1000, () => 0);
    await expect(f()).rejects.toThrow("x");
    expect(await f()).toBe(7);
  });
});

describe("memoBy", () => {
  it("un changement de version invalide tout de suite, meme dans le delai; sinon le resultat est partage", async () => {
    const { memoBy } = await import("./memo");
    let v = 0, calls = 0;
    const get = memoBy(async () => ++calls, 60000, () => v);
    expect([await get(), await get()]).toEqual([1, 1]);
    v++;
    expect(await get()).toBe(2);
    expect(await get()).toBe(2);
  });
});
