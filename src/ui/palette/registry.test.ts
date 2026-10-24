import { describe, expect, it, vi } from "vitest";
import { createRegistry, defaultRegistry, registerCommand } from "./registry";
import { fuzzyFilter } from "./fuzzy";

/**
 * Tests of the palette command registry: registration, id duplicates
 * (replace), unregister, listing order, run, recents and fuzzy filtering.
 */
const mk = (id: string, label = id, run = () => {}) => ({ id, label, run });

describe("command registry", () => {
  it("registers and lists in registration order", () => {
    const r = createRegistry();
    r.register(mk("a")); r.register(mk("b"));
    expect(r.list().map((c) => c.id)).toEqual(["a", "b"]);
  });
  it("replaces a command with the same id (no duplicate)", () => {
    const r = createRegistry();
    r.register(mk("a", "old")); r.register(mk("a", "new"));
    expect(r.list()).toHaveLength(1);
    expect(r.list()[0].label).toBe("new");
  });
  it("runs a registered command", () => {
    const r = createRegistry();
    const run = vi.fn();
    r.register(mk("a", "A", run));
    r.list()[0].run();
    expect(run).toHaveBeenCalledOnce();
  });
  it("unregister removes the command", () => {
    const r = createRegistry();
    const off = r.register(mk("a"));
    off();
    expect(r.list()).toEqual([]);
  });
  it("stale unregister does not remove a replacement", () => {
    const r = createRegistry();
    const off = r.register(mk("a", "old"));
    r.register(mk("a", "new"));
    off();
    expect(r.list().map((c) => c.label)).toEqual(["new"]);
  });
  it("tracks recents: most recent first, -1 if unused", () => {
    const r = createRegistry();
    r.register(mk("a")); r.register(mk("b"));
    r.markUsed("a"); r.markUsed("b"); r.markUsed("a");
    expect(r.recentRank("a")).toBe(0);
    expect(r.recentRank("b")).toBe(1);
    expect(r.recentRank("zzz")).toBe(-1);
  });
  it("caps recents at 20", () => {
    const r = createRegistry();
    for (let i = 0; i < 25; i++) r.markUsed("c" + i);
    expect(r.recentRank("c24")).toBe(0);
    expect(r.recentRank("c4")).toBe(-1);
  });
  it("registries are isolated from each other", () => {
    const a = createRegistry(); const b = createRegistry();
    a.register(mk("x"));
    expect(b.list()).toEqual([]);
  });
  it("search filters registered commands by label", () => {
    const r = createRegistry();
    r.register(mk("1", "Insérer une ligne")); r.register(mk("2", "Gras"));
    expect(fuzzyFilter("gras", r.list(), (c) => c.label).map((c) => c.id)).toEqual(["2"]);
  });
  it("registerCommand uses the default registry", () => {
    const off = registerCommand(mk("reg-test"));
    expect(defaultRegistry.list().some((c) => c.id === "reg-test")).toBe(true);
    off();
    expect(defaultRegistry.list().some((c) => c.id === "reg-test")).toBe(false);
  });
});
