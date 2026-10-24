// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createDocEditor } from "./editor";
import { emptyDoc } from "./schema";

const content = { type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "text", text: "Bonjour" }] }] };

describe("éditeur de document", () => {
  it("affiche le contenu dans un élément éditable", () => {
    const host = document.createElement("div");
    const ed = createDocEditor(host, content, () => {});
    const el = host.querySelector<HTMLElement>(".ProseMirror")!;
    expect(el.textContent).toBe("Bonjour");
    expect(el.getAttribute("contenteditable")).toBe("true");
    ed.destroy();
  });
  it("notifie le nouveau contenu JSON à chaque modification, pas au chargement", () => {
    const host = document.createElement("div");
    const cb = vi.fn();
    const ed = createDocEditor(host, emptyDoc() as typeof content, cb);
    expect(cb).not.toHaveBeenCalled();
    ed.view.dispatch(ed.view.state.tr.insertText("Salut"));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(cb.mock.calls[0][0])).toContain("Salut");
    ed.destroy();
  });
  it("annule et rétablit avec l'historique propre au document", () => {
    const host = document.createElement("div");
    const ed = createDocEditor(host, emptyDoc() as typeof content, () => {});
    ed.view.dispatch(ed.view.state.tr.insertText("abc"));
    expect(ed.undo()).toBe(true);
    expect(ed.view.state.doc.textContent).toBe("");
    expect(ed.redo()).toBe(true);
    expect(ed.view.state.doc.textContent).toBe("abc");
    ed.destroy();
  });
  it("destroy retire le DOM", () => {
    const host = document.createElement("div");
    createDocEditor(host, content, () => {}).destroy();
    expect(host.querySelector(".ProseMirror")).toBeNull();
  });
});
