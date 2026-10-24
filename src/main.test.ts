// @vitest-environment jsdom
/** Smoke test of the entry point: importing main mounts the UI into #app without throwing. */
import { describe, expect, it } from "vitest";

describe("main", () => {
  it("mounts the layout when #app exists", async () => {
    document.body.innerHTML = '<div id="app"></div>';
    await import("./main");
    expect(document.querySelector("#app .dk-app")).not.toBeNull();
    expect(document.querySelector("#app .dkg")).not.toBeNull();
  });
});
