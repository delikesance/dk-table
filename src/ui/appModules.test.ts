// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as app from "./app";
import * as state from "./appState";
import * as gridMod from "./appGrid";
import * as api from "./appApi";
import * as widgets from "./appWidgets";

/** Locks the public surface of the app modules (split of app.ts). */
describe("app modules exports", () => {
  it("exposes the key functions", () => {
    expect(typeof app.mount).toBe("function");
    expect(typeof state.keysOf).toBe("function");
    expect(typeof state.firstKey).toBe("function");
    expect(typeof state.setTitle).toBe("function");
    expect(typeof gridMod.buildGrid).toBe("function");
    expect(typeof gridMod.syncInfo).toBe("function");
    expect(typeof gridMod.touch).toBe("function");
    expect(typeof gridMod.refreshTabs).toBe("function");
    expect(typeof api.createApi).toBe("function");
    expect(typeof widgets.createWidgets).toBe("function");
  });

  it("keysOf expands a range and a single key", () => {
    expect(state.keysOf("A1:B2")).toHaveLength(4);
    expect(state.keysOf("C3")).toEqual(["C3"]);
  });
});
