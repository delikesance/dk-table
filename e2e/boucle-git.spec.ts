/**
 * Boucle e2e, git reel : worktrees, fusions, push vers un distant bare.
 * Vrai serveur + vrai git (depot temporaire) + faux agents (e2e/boucle/).
 */
import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { startBoucle, type Boucle } from "./boucle/harness";

const ideas = [{ title: "Texte en colonnes", source: "Decoupe." }, { title: "Tri multiple", source: "Trie." }];
const infos = (b: Boucle) => b.events.filter((e) => e.type === "info").map((e) => e.message ?? "");
const worktrees = async (b: Boucle) => (await b.repo.git(["worktree", "list"])).out.split("\n").filter(Boolean).slice(1);

test("sans conflit, origin/developpement suit developpement apres chaque fusion", async () => {
  const b = await startBoucle({ ideas });
  await b.go(5); await b.waitDone();
  const local = (await b.repo.git(["rev-parse", "developpement"])).out.trim();
  expect((await b.repo.git(["rev-parse", "developpement"], b.repo.origin)).out.trim()).toBe(local);
  expect((await b.repo.git(["rev-parse", "master"], b.repo.origin)).out.trim()).toBe((await b.repo.git(["rev-parse", "master"])).out.trim()); // master intact
  await b.close();
});

test("distant en avance et en conflit : push refuse proprement, rien de coince, la boucle va au bout", async () => {
  let ready!: () => void;
  const pushedByOther = new Promise<void>((r) => (ready = r));
  let started = false;
  const b: Boucle = await startBoucle({ ideas, script: {
    gate: (w) => (w.startsWith("implementation") ? pushedByOther : undefined),
    onRun: async (sector) => {
      if (sector !== "implementation" || started) return;
      started = true;
      const r = b.repo, dir = r.cwd + "-other";
      await r.git(["clone", r.origin, dir], r.cwd + "/..");
      await r.git(["config", "user.email", "o@x"], dir); await r.git(["config", "user.name", "O"], dir);
      await r.git(["checkout", "developpement"], dir);
      for (const f of ["texte-en-colonnes", "tri-multiple"]) r.write(`src/${f}.ts`, "autre\n", dir); // les deux cartes se heurtent a l'autre clone
      await r.git(["add", "-A"], dir); await r.git(["commit", "-m", "autre"], dir);
      expect((await r.git(["push", "origin", "developpement"], dir)).code).toBe(0);
      ready();
    },
  } });
  await b.go(5);
  const done = await b.waitDone();
  expect(done.complete).toBe(true);
  expect(infos(b).some((m) => /push non effectue : push rejete, conflit avec origin\/developpement/.test(m))).toBe(true);
  expect(existsSync(b.repo.cwd + "/.git/MERGE_HEAD")).toBe(false);
  expect((await b.repo.git(["status", "--porcelain"])).out.trim()).toBe("");
  expect((await b.repo.git(["rev-parse", "--abbrev-ref", "HEAD"])).out.trim()).toBe("developpement");
  await b.close();
});

test("les worktrees des agents sans resultat sont retires (le travail reste dans la branche)", async () => {
  const b = await startBoucle({
    ideas: [...ideas, { title: "Zoom", source: "Zoom." }],
    script: { card: (id) => (id === "zoom" ? { kind: "wip" } : { kind: "done", file: "src/shared.ts", text: `export const v = "${id}";\n` }) }, // conflit (2 cartes) + carte sans commit
  });
  await b.go(5); await b.waitDone(90_000);
  expect(await worktrees(b)).toEqual([]);
  await b.close();
});

test("tests rouges : worktree retire, branche gardee, developpement intact", async () => {
  const b = await startBoucle({ ideas, checks: (cmd, dir) => (cmd === "npm test" && existsSync(dir + "/src/tri-multiple.ts") ? { code: 1, out: "FAIL src/tri.test.ts > tri\n" } : { code: 0, out: "" }) });
  await b.go(5); await b.waitDone(90_000);
  expect(await worktrees(b)).toEqual([]);
  expect((await b.repo.git(["branch", "--list", "wt/implementation-tri-multiple-*"])).out.trim()).not.toBe(""); // travail conserve
  expect(existsSync(b.repo.cwd + "/src/tri-multiple.ts")).toBe(false);
  await b.close();
});
