// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createSheet } from "../engine/sheet";
import { createDocEditor, type CopyInfo } from "./editor";
import { emptyDoc } from "./emptyDoc";

const book = { sheets: () => [{ id: "s1", name: "Synthese", sheet: createSheet(), styles: {} }] };
afterEach(() => { document.body.innerHTML = ""; });

function paste(copy: CopyInfo | null, text: string) {
  const host = document.body.appendChild(document.createElement("div"));
  const ed = createDocEditor(host, emptyDoc(), () => {}, { book, open: () => {}, lastCopy: () => copy });
  const e = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(e, "clipboardData", { value: { getData: (t: string) => (t === "text/plain" ? text : ""), types: ["text/plain"] } });
  ed.view.dom.dispatchEvent(e);
  return ed.view.state.doc;
}

describe("coller dans un document", () => {
  it("une plage copiée dans la feuille devient un bloc lié", () => {
    const d = paste({ text: "a\tb\nc\td", sheet: "s1", ref: "A1:B2" }, "a\tb\nc\td");
    const b = d.firstChild!;
    expect(b.type.name).toBe("liveBlock");
    expect(b.attrs).toMatchObject({ sheet: "s1", ref: "A1:B2", kind: "table", header: true });
  });
  it("une seule cellule devient une puce inline", () => {
    const d = paste({ text: "42", sheet: "s1", ref: "B3" }, "42");
    expect(d.firstChild!.firstChild!.type.name).toBe("cellRef");
    expect(d.firstChild!.firstChild!.attrs).toMatchObject({ sheet: "s1", ref: "B3" });
  });
  it("un texte externe est collé tel quel", () => {
    const d = paste({ text: "a", sheet: "s1", ref: "A1" }, "autre chose");
    expect(d.textContent).toBe("autre chose");
  });
});
