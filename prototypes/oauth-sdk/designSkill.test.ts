// @vitest-environment node
/** Tests du skill design-canvas : frontmatter valide, gabarit autonome (sans reseau), deux themes, <= 200 lignes. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(__dirname, "..", "..", ".claude", "skills", "design-canvas");
/** Lit un fichier texte du depot; le checkout Windows (autocrlf) peut le livrer en CRLF. */
export const readLf = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const FRONT = /^---\nname: design-canvas\ndescription: .{40,}\n---/;
const skill = readLf(join(dir, "SKILL.md"));
const starter = readLf(join(dir, "starter.html"));

describe("skill design-canvas", () => {
  it("frontmatter name + description, <= 200 lignes, decrit le canevas et les messages", () => {
    expect(skill).toMatch(FRONT);
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
  it("tolere les fins de ligne CRLF (checkout Windows)", () => {
    const crlf = skill.replace(/\n/g, "\r\n");
    expect(crlf).not.toMatch(FRONT);
    expect(crlf.replace(/\r\n/g, "\n")).toMatch(FRONT);
    expect(readLf(join(dir, "SKILL.md"))).not.toContain("\r");
  });
});
