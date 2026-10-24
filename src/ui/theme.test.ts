// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { applyTheme, resolveTheme, savedThemePref, THEME_KEY } from "./theme";

describe("theme", () => {
  beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.theme; });

  it("auto suit la préférence système", () => {
    expect(resolveTheme("auto", true)).toBe("dark");
    expect(resolveTheme("auto", false)).toBe("light");
  });
  it("un choix explicite l'emporte", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("applyTheme pose data-theme et mémorise le choix", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(savedThemePref()).toBe("dark");
  });
  it("préférence absente ou invalide = auto", () => {
    expect(savedThemePref()).toBe("auto");
    localStorage.setItem(THEME_KEY, "rose");
    expect(savedThemePref()).toBe("auto");
  });
});
