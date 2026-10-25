import { describe, expect, it, vi } from "vitest";
import { createDocStore } from "./store";

describe("magasin de documents", () => {
  it("crée un document vide avec un nom numéroté et un id unique", () => {
    const s = createDocStore();
    const a = s.add();
    const b = s.add();
    expect(a.name).toBe("Document 1");
    expect(b.name).toBe("Document 2");
    expect(a.id).not.toBe(b.id);
    expect(s.list().map((d) => d.id)).toEqual([a.id, b.id]);
  });
  it("renomme, met à jour le contenu et supprime", () => {
    const s = createDocStore();
    const a = s.add();
    s.rename(a.id, "Rapport T1");
    s.setText(a.id, "# Titre");
    expect(s.get(a.id)!.md).toBe("# Titre");
    expect(s.get(a.id)!.name).toBe("Rapport T1");
    s.remove(a.id);
    expect(s.get(a.id)).toBeUndefined();
    expect(s.list()).toEqual([]);
  });
  it("charge et exporte la liste persistée (copie profonde)", () => {
    const s = createDocStore();
    const saved = [{ id: "d9", name: "X", md: "texte" }];
    s.load(saved);
    saved[0].name = "modifié après coup";
    expect(s.list()[0].name).toBe("X");
    const out = s.toDocs();
    expect(out).toEqual(s.list());
    expect(out).not.toBe(s.list());
    expect(createDocStore().toDocs()).toBeUndefined();
  });
  it("notifie à chaque modification", () => {
    const s = createDocStore();
    const cb = vi.fn();
    s.onChange(cb);
    const a = s.add();
    s.rename(a.id, "Y");
    s.setText(a.id, "x");
    s.remove(a.id);
    expect(cb).toHaveBeenCalledTimes(4);
    s.load([]);
    expect(cb).toHaveBeenCalledTimes(4);
  });
  it("réordonne les documents", () => {
    const s = createDocStore();
    const [a, b, c] = [s.add(), s.add(), s.add()];
    s.reorder([c.id, a.id, b.id]);
    expect(s.list().map((d) => d.id)).toEqual([c.id, a.id, b.id]);
  });
});
