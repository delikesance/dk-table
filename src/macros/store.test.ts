import { describe, expect, it, vi } from "vitest";
import { createMacroStore } from "./store";

describe("createMacroStore", () => {
  it("creates macros with unique default names", () => {
    const s = createMacroStore();
    const a = s.create(), b = s.create();
    expect([a.name, b.name]).toEqual(["Macro 1", "Macro 2"]);
    expect(a.id).not.toBe(b.id);
    expect(s.list()).toHaveLength(2);
    s.remove(a.id);
    expect(s.create().name).toBe("Macro 1");
  });

  it("updates code and name, trimming names and ignoring empty ones", () => {
    const s = createMacroStore();
    const m = s.create();
    s.update(m.id, { code: "print(1)", name: "  Totaux " });
    expect(s.get(m.id)).toEqual({ id: m.id, name: "Totaux", code: "print(1)" });
    s.update(m.id, { name: "  " });
    expect(s.get(m.id)?.name).toBe("Totaux");
  });

  it("loads a list (copied) and notifies listeners on every change", () => {
    const s = createMacroStore();
    const fn = vi.fn();
    s.onChange(fn);
    const src = [{ id: "m1", name: "A", code: "" }];
    s.load(src);
    src[0].name = "changed";
    expect(s.list()[0].name).toBe("A");
    s.update("m1", { code: "x" });
    s.remove("m1");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
