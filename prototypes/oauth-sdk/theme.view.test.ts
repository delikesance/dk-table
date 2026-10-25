// @vitest-environment jsdom
/** theme.js : pose data-theme (light|dark) selon le systeme, comme src/ui/theme.ts pour l'app. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const js = readFileSync(join(__dirname, "theme.js"), "utf8");
function run(dark: boolean) {
  let cb: (() => void) | undefined;
  const mql = { matches: dark, addEventListener: (_: string, f: () => void) => { cb = f; } };
  window.matchMedia = (() => mql) as never;
  document.documentElement.removeAttribute("data-theme");
  new Function(js)();
  return { mql, change: (d: boolean) => { mql.matches = d; cb?.(); } };
}
it("sombre si le systeme est sombre, clair sinon, et suit les changements", () => {
  expect(run(true) && document.documentElement.getAttribute("data-theme")).toBe("dark");
  const r = run(false);
  expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  r.change(true);
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
});
