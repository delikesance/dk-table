import { afterEach, describe, expect, it, vi } from "vitest";

const g = globalThis as { process?: unknown };
const real = g.process;

afterEach(() => { g.process = real; vi.resetModules(); });

describe("envHide / envRestore", () => {
  it("hides the Vite dev shim (no `versions`) while fengari loads, then restores it", async () => {
    const shim = { env: {} };
    g.process = shim;
    vi.resetModules();
    await import("./envHide");
    expect(g.process).toBeUndefined();
    await import("./envRestore");
    expect(g.process).toBe(shim);
  });

  it("leaves a real Node process untouched", async () => {
    vi.resetModules();
    await import("./envHide");
    expect(g.process).toBe(real);
  });
});
