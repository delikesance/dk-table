// @vitest-environment jsdom
/** Tests of appState helpers: setTitle/dirty marker and initial state after mount. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";
import { setTitle, type Ctx } from "./appState";
import { setPassword } from "./protection";

let app: App;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  app = mount(document.getElementById("app")!);
});

describe("appState", () => {
  it("starts clean with one sheet", () => {
    expect(app.dirty).toBeFalsy();
    expect(app.path).toBeUndefined();
    expect(app.sheets()).toHaveLength(1);
  });
  it("edit sets dirty and the bullet in the title", () => {
    app.edit("A1", "1");
    expect(app.dirty).toBe(true);
    expect(document.title).toBe("Sans titre • — dk-table");
  });
  it("markSaved clears dirty and the bullet", () => {
    app.edit("A1", "1");
    app.markSaved();
    expect(app.dirty).toBe(false);
    expect(document.title).toBe("Sans titre — dk-table");
  });
  it("setTitle uses the path basename (Windows and POSIX)", () => {
    const c = { app: { path: "C:\\x\\f.dktable" } } as unknown as Ctx;
    setTitle(c, true);
    expect(document.title).toBe("f.dktable • — dk-table");
    c.app.path = "/x/g.dktable";
    setTitle(c, false);
    expect(document.title).toBe("g.dktable — dk-table");
    expect(c.app.dirty).toBe(false);
  });
  it("shows the lock marker while the workbook is encrypted", () => {
    setPassword("secret");
    expect(document.title).toBe("Sans titre (chiffré) — dk-table");
    setPassword(undefined);
    expect(document.title).toBe("Sans titre — dk-table");
  });
  it("loadDoc leaves the document clean", () => {
    app.edit("A1", "1");
    app.loadDoc(app.toDoc());
    expect(app.dirty).toBe(false);
  });
});
