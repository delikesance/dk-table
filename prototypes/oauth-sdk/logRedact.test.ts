/** Masquage des secrets, ANSI et troncature dans les logs techniques. */
import { describe, expect, it } from "vitest";
import { clip, createRedactor, stripAnsi } from "./logRedact";

const TOKEN = "sk-ant-oat01-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
describe("createRedactor", () => {
  const red = createRedactor({ CLAUDE_CODE_OAUTH_TOKEN: TOKEN, MY_API_KEY: "valeur-secrete-1", PATH: "/usr/bin", PORT: "4317", GH_PASSWORD: "pw" });
  it("masque les jetons connus (motif sk-ant-, valeur d'une variable sensible), jamais le reste", () => {
    expect(red(`token ${TOKEN} fin`)).toBe("token [masqué] fin");
    expect(red("cle valeur-secrete-1 ok /usr/bin 4317")).toBe("cle [masqué] ok /usr/bin 4317");
  });
  it("masque les motifs generiques: Bearer, ghp_, github_pat_, JWT, NOM=valeur sensible, JSON", () => {
    for (const t of ["Authorization: Bearer abcdefghij1234567890", "ghp_" + "a".repeat(36), "github_pat_" + "B".repeat(30), "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.c2lnbmF0dXJl",
      "CLAUDE_CODE_OAUTH_TOKEN=zzzzzzzzzz", '{"CLAUDE_CODE_OAUTH_TOKEN":"zzzzzzzzzz"}', "sk-" + "x".repeat(32)]) {
      expect(red(t), t).toContain("[masqué]");
      expect(red(t), t).not.toMatch(/abcdefghij1234567890|a{36}|B{30}|c2lnbmF0dXJl|zzzzzzzzzz|x{32}/);
    }
  });
  it("valeur trop courte (< 6) d'une variable sensible: non masquee (evite de casser le texte)", () => {
    expect(red("pw")).toBe("pw");
  });
  it("masque aussi dans les objets imbriques (champs, stack)", () => {
    expect(red.deep({ a: [`x ${TOKEN}`], b: { c: TOKEN }, n: 3 })).toEqual({ a: ["x [masqué]"], b: { c: "[masqué]" }, n: 3 });
  });
});
describe("stripAnsi / clip", () => {
  it("retire les codes ANSI", () => expect(stripAnsi("\u001b[31mrouge\u001b[0m")).toBe("rouge"));
  it("clip garde début et fin, indique ce qui est coupé; texte court inchangé", () => {
    expect(clip("abc", 10)).toBe("abc");
    const c = clip("a".repeat(100) + "Z".repeat(100), 50);
    expect(c.length).toBeLessThan(120);
    expect(c.startsWith("a")).toBe(true);
    expect(c.endsWith("Z")).toBe(true);
    expect(c).toMatch(/\d+ car\. omis/);
  });
});
