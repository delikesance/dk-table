/** Journal technique JSON Lines: un fichier par run, niveaux, enfants (agent/carte), rotation, limite de taille, masquage. */
import { mkdtempSync, readFileSync, readdirSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createLogs, levelOf } from "./logger";

const dir = () => mkdtempSync(join(tmpdir(), "logs-"));
const lines = (d: string, run: string) => readFileSync(join(d, run + ".jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));

describe("levelOf", () => {
  it("BOUCLE_LOG=debug|info|warn|error, defaut info, inconnu -> info", () => {
    expect([levelOf("debug"), levelOf("WARN"), levelOf(undefined), levelOf("zzz")]).toEqual(["debug", "warn", "info", "info"]);
  });
});
describe("createLogs", () => {
  it("un fichier par run: ts ISO, duree depuis le debut, niveau, composant, run, champs", () => {
    const d = dir(); let t = Date.parse("2026-01-01T00:00:00Z");
    const logs = createLogs({ dir: d, now: () => t, env: {} });
    const l = logs.start();
    t += 1500;
    l.info("git", "fusion", { cmd: "git merge x", code: 0 });
    const [e] = lines(d, l.run).filter((x) => x.comp === "git");
    expect(e).toMatchObject({ level: "info", comp: "git", msg: "fusion", run: l.run, ms: 1500, cmd: "git merge x", code: 0 });
    expect(e.ts).toBe("2026-01-01T00:00:01.500Z");
    expect(readdirSync(d).filter((f) => f.endsWith(".jsonl"))).toHaveLength(1);
  });
  it("niveau: debug masque a info, visible a debug; error toujours", () => {
    const d = dir();
    const a = createLogs({ dir: d, env: {}, level: "info" }).start();
    a.debug("x", "cache"); a.error("x", "boum");
    expect(lines(d, a.run).map((x) => x.msg)).not.toContain("cache");
    expect(lines(d, a.run).map((x) => x.msg)).toContain("boum");
    const b = createLogs({ dir: d, env: {}, level: "debug" }).start();
    b.debug("x", "cache");
    expect(lines(d, b.run).map((x) => x.msg)).toContain("cache");
  });
  it("child: agent et carte ajoutes a chaque ligne", () => {
    const d = dir(); const l = createLogs({ dir: d, env: {} }).start().child({ agent: "a, b", card: "a" });
    l.info("impl", "debut");
    expect(lines(d, l.run).at(-1)).toMatchObject({ agent: "a, b", card: "a" });
  });
  it("secrets masques partout, sortie nettoyee (ANSI) et tronquee, erreur avec stack", () => {
    const TOK = "sk-ant-oat01-SECRETSECRETSECRET1234";
    const d = dir(); const l = createLogs({ dir: d, env: { CLAUDE_CODE_OAUTH_TOKEN: TOK } }).start();
    l.info("run", "cmd", { out: "\u001b[32mok\u001b[0m " + TOK + "z".repeat(5000), env: { CLAUDE_CODE_OAUTH_TOKEN: TOK } });
    l.error("run", "echec " + TOK, { err: new Error("pete " + TOK) });
    const raw = readFileSync(join(d, l.run + ".jsonl"), "utf8");
    expect(raw).not.toContain("SECRETSECRET");
    const [o, e] = lines(d, l.run).slice(-2);
    expect(o.out).not.toContain("\u001b");
    expect(o.out.length).toBeLessThan(2600);
    expect(e.err.message).toContain("pete");
    expect(e.err.stack).toContain("Error");
  });
  it("taille maximale par run: au-dela, une derniere ligne « journal tronque » puis plus rien (les erreurs passent toujours dans la limite x2)", () => {
    const d = dir(); const l = createLogs({ dir: d, env: {}, maxBytes: 2000 }).start();
    for (let i = 0; i < 200; i++) l.info("x", "ligne " + i + " " + "m".repeat(50));
    const size = readFileSync(join(d, l.run + ".jsonl")).length;
    expect(size).toBeLessThan(3000);
    expect(lines(d, l.run).some((x) => /tronqu/.test(x.msg))).toBe(true);
  });
  it("rotation: seuls les `maxFiles` plus recents sont gardes", () => {
    const d = dir();
    for (let i = 0; i < 5; i++) { const f = join(d, `old${i}.jsonl`); writeFileSync(f, "{}\n"); utimesSync(f, 1000 + i, 1000 + i); }
    createLogs({ dir: d, env: {}, maxFiles: 3 }).start();
    const left = readdirSync(d).filter((f) => f.endsWith(".jsonl"));
    expect(left).toHaveLength(3);
    expect(left).not.toContain("old0.jsonl");
  });
  it("ne leve jamais, meme si le dossier est inecrivible", () => {
    const d = dir(); writeFileSync(join(d, "fichier"), "x"); // un fichier tient lieu de dossier
    const l = createLogs({ dir: join(d, "fichier", "sous"), env: {} }).start();
    expect(() => l.info("x", "ok")).not.toThrow();
  });
});
