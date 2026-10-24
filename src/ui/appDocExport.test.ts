// @vitest-environment jsdom
/** Export du document ouvert : Markdown / HTML via la boîte d'enregistrement, PDF via l'impression. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type App } from "./app";

let app: App;
let written: Record<string, string>;

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  written = {};
  (globalThis as { __DK_IO__?: unknown }).__DK_IO__ = {
    open: async () => null, readTextFile: async () => "",
    save: async () => "/tmp/doc",
    writeTextFile: async (p: string, d: string) => { written[p] = d; },
  };
  app = mount(document.getElementById("app")!);
  app.edit("B2", "40");
});

async function docWithText(): Promise<void> {
  app.addDoc();
  await vi.waitFor(() => expect(app.docEditor()).toBeDefined());
  const v = app.docEditor()!.view;
  v.dispatch(v.state.tr.insertText("Bonjour"));
  v.dispatch(v.state.tr.insert(1, v.state.schema.nodes.cellRef.create({ sheet: app.sheets()[0].id, ref: "B2" })));
}

describe("exporter le document ouvert", () => {
  it("Markdown : écrit le texte avec la valeur citée", async () => {
    await docWithText();
    await app.exportDoc("md");
    expect(written["/tmp/doc.md"]).toContain("Bonjour");
    expect(written["/tmp/doc.md"]).toContain("40");
  });
  it("HTML : page complète", async () => {
    await docWithText();
    await app.exportDoc("html");
    expect(written["/tmp/doc.html"]).toContain("<!doctype html>");
  });
  it("sans document ouvert, ne fait rien", async () => {
    await app.exportDoc("md");
    expect(written).toEqual({});
  });
  it("Ctrl+E ouvre la boîte d'export avec les trois formats", async () => {
    await docWithText();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "e", ctrlKey: true, bubbles: true }));
    const d = document.querySelector(".dk-dialog")!;
    expect(d.textContent).toContain("Markdown");
    expect(d.textContent).toContain("HTML");
    expect(d.textContent).toContain("PDF");
  });
});
