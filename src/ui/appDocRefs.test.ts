// @vitest-environment jsdom
/** Live references of a dk doc inside the app: values follow the sheet, click opens the cell, Alt+← comes back. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const chip = () => root.querySelector<HTMLElement>(".dk-ref")!;

/** Open a new document containing one reference to the first sheet's `ref`. */
async function docWithRef(ref: string): Promise<string> {
  const sheet = app.sheets()[0].id;
  const id = app.addDoc();
  await vi.waitFor(() => expect(app.docEditor()).toBeDefined());
  const v = app.docEditor()!.view;
  v.dispatch(v.state.tr.insert(1, v.state.schema.nodes.cellRef.create({ sheet, ref })));
  return id;
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
  app.edit("B2", "40");
});

describe("références dans le document ouvert", () => {
  it("la puce suit la feuille quand une cellule change", async () => {
    await docWithRef("B2");
    expect(chip().textContent).toBe("40");
    app.edit("B2", "99");
    expect(chip().textContent).toBe("99");
  });
  it("la puce suit le renommage de la feuille", async () => {
    await docWithRef("B2");
    chip().dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(document.querySelector(".dk-refcard")!.textContent).toContain("Feuille 1!B2");
  });
  it("un clic ouvre la cellule dans la feuille, Alt+← ramène au document", async () => {
    const id = await docWithRef("B2");
    chip().click();
    expect(app.activeDocId()).toBeUndefined();
    expect(app.selection()).toBe("B2");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", altKey: true, bubbles: true }));
    expect(app.activeDocId()).toBe(id);
  });
  it("la puce survit à l'enregistrement et à la réouverture du classeur", async () => {
    const id = await docWithRef("B2");
    const saved = app.toDoc();
    app.loadDoc(saved);
    await app.openDoc(id);
    await vi.waitFor(() => expect(chip()?.textContent).toBe("40"));
  });
});
