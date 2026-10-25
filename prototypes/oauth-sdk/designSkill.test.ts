// @vitest-environment node
/** Tests du skill design-canvas : frontmatter valide, gabarit autonome (sans reseau), deux themes, <= 200 lignes. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(__dirname, "..", "..", ".claude", "skills", "design-canvas");
const skill = readFileSync(join(dir, "SKILL.md"), "utf8");
const starter = readFileSync(join(dir, "starter.html"), "utf8");

describe("skill design-canvas", () => {
  it("frontmatter name + description, <= 200 lignes, decrit le canevas et les messages", () => {
    expect(skill).toMatch(/^---\nname: design-canvas\ndescription: .{40,}\n---/);
    expect(skill.split("\n").length).toBeLessThanOrEqual(200);
    for (const w of ["docs/design/", "data-theme", "prefers-color-scheme", "Aucune requête", "animation"]) expect(skill).toContain(w);
  });
  it("gabarit: autonome, sans reseau, themes clair/sombre, animation respectueuse de reduced-motion", () => {
    expect(starter.split("\n").length).toBeLessThanOrEqual(200);
    expect(starter).not.toMatch(/https?:\/\/|<link[^>]+href|<script[^>]+src/i);
    expect(starter).toContain('[data-theme="dark"]');
    expect(starter).toContain("prefers-color-scheme: dark");
    expect(starter).toContain("prefers-reduced-motion");
    expect(starter).toContain("@keyframes");
  });
});
