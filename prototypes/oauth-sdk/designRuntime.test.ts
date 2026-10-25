// @vitest-environment jsdom
/** Tests du petit runtime injecte dans chaque design : theme, pause, erreurs, pret. */
import { describe, expect, it, vi } from "vitest";
import { RUNTIME_JS, injectRuntime } from "./designRuntime";

describe("injectRuntime", () => {
  it("insere avant </body>, une seule fois, ou en fin de document sans body", () => {
    const a = injectRuntime("<html><body><p>x</p></body></html>");
    expect(a.indexOf("data-dk-runtime")).toBeLessThan(a.indexOf("</body>"));
    expect(injectRuntime(a)).toBe(a);
    expect(injectRuntime("<p>x</p>").endsWith("</script>")).toBe(true);
  });
  it("le runtime ne fait aucune requete reseau", () => {
    expect(RUNTIME_JS).not.toMatch(/fetch|XMLHttpRequest|WebSocket|http/);
  });
});

describe("runtime dans la page", () => {
  const boot = () => {
    const post = vi.spyOn(window.parent, "postMessage").mockImplementation(() => {});
    document.documentElement.removeAttribute("data-theme");
    new Function(RUNTIME_JS)();
    return post;
  };
  const send = (m: object) => window.dispatchEvent(new MessageEvent("message", { data: { dk: 1, ...m } }));

  it("annonce `ready`, relaie les erreurs et console.error", () => {
    const post = boot();
    expect(post.mock.calls[0][0]).toMatchObject({ dk: 1, type: "ready" });
    window.dispatchEvent(new ErrorEvent("error", { message: "boum", lineno: 3, colno: 4 }));
    expect(post.mock.calls.some((c) => (c[0] as { message?: string }).message?.includes("boum (3:4)"))).toBe(true);
    console.error("pb"); // eslint-disable-line no-console
    expect(post.mock.calls.some((c) => (c[0] as { message?: string }).message === "pb")).toBe(true);
  });
  it("theme clair/sombre/auto pose data-theme et color-scheme", () => {
    boot();
    send({ type: "theme", value: "dark" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    send({ type: "theme", value: "auto" });
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
  it("pause fige les animations CSS (feuille dediee), reprise la retire", () => {
    boot();
    send({ type: "pause", value: true });
    expect(document.getElementById("dk-pause")?.textContent).toContain("animation-play-state:paused");
    send({ type: "pause", value: false });
    expect(document.getElementById("dk-pause")).toBeNull();
  });
  it("ignore les messages sans marqueur", () => {
    boot();
    window.dispatchEvent(new MessageEvent("message", { data: { type: "theme", value: "dark" } }));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});
