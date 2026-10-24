import { describe, expect, it } from "vitest";
import { createRecents, type KeyValueStore } from "./recents";

/** In-memory storage standing in for localStorage. */
const mem = (): KeyValueStore => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

describe("createRecents", () => {
  it("persists across 'reloads' sharing the same storage", () => {
    const s = mem();
    createRecents(s).add("/a.dktable");
    expect(createRecents(s).list()).toEqual(["/a.dktable"]);
  });
  it("orders most recent first and dedupes", () => {
    const r = createRecents(mem());
    r.add("/a"); r.add("/b"); r.add("/a");
    expect(r.list()).toEqual(["/a", "/b"]);
  });
  it("caps the list", () => {
    const r = createRecents(mem(), 3);
    ["/1", "/2", "/3", "/4"].forEach((p) => r.add(p));
    expect(r.list()).toEqual(["/4", "/3", "/2"]);
  });
  it("ignores corrupt or missing storage", () => {
    const s = mem();
    s.setItem("dk-table.recents", "{oops");
    expect(createRecents(s).list()).toEqual([]);
    expect(createRecents(null).list()).toEqual([]);
  });
});
