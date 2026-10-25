/**
 * Depot temporaire pour les tests e2e de la Boucle : vrai git, distant bare, cartes du moodboard.
 *
 * Quoi : `makeRepo(cards)` cree `work/` (branche master, un commit avec la recherche, TODO.md, .gitignore)
 *        et `origin.git` (bare), puis rend `git(args, dir?)` et `cleanup()`.
 * Pourquoi : la Boucle pilote le vrai git (worktrees, fusions, push); seul le modele et npm sont faux.
 * Usage : `const r = await makeRepo([{ title: "Texte en colonnes", source: "Decoupe." }])`.
 */
import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** Idee de la synthese de recherche (axe « Idees nouvelles »). */
export interface Idea { title: string; source: string }

/** Depot de test. */
export interface TestRepo {
  /** Racine du depot (arbre principal). */
  cwd: string;
  /** Distant bare. */
  origin: string;
  git: (args: string[], dir?: string) => Promise<{ code: number; out: string }>;
  write: (rel: string, text: string, dir?: string) => void;
  cleanup: () => void;
}

/** Lance une commande sans shell; sortie fusionnee, jamais d'exception. */
export const sh = (cmd: string, args: string[], cwd: string): Promise<{ code: number; out: string }> =>
  new Promise((resolve) => {
    execFile(cmd, args, { cwd, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, maxBuffer: 1 << 26 }, (err, stdout, stderr) => {
      const code = err ? (typeof (err as { code?: unknown }).code === "number" ? (err as { code: number }).code : 1) : 0;
      resolve({ code, out: String(stdout) + String(stderr) });
    });
  });

/** Contenu de `docs/recherche/fonctionnalites.md` pour ces idees. */
export const researchDoc = (ideas: Idea[]): string =>
  "# Recherche de fonctionnalites\n\n## Idees nouvelles\n\n" + ideas.map((i) => `- **${i.title}** : ${i.source}`).join("\n") + "\n";

/** Cree le depot et son distant. */
export async function makeRepo(ideas: Idea[]): Promise<TestRepo> {
  const root = mkdtempSync(join(tmpdir(), "boucle-e2e-"));
  const cwd = join(root, "work"), origin = join(root, "origin.git");
  mkdirSync(cwd);
  const git = (args: string[], dir = cwd) => sh("git", args, dir);
  const write = (rel: string, text: string, dir = cwd) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  };
  await sh("git", ["init", "--bare", "-b", "master", origin], root);
  await git(["init", "-b", "master"]);
  for (const [k, v] of [["user.name", "Test"], ["user.email", "t@example.com"], ["commit.gpgsign", "false"]]) await git(["config", k, v]);
  write("docs/recherche/fonctionnalites.md", researchDoc(ideas));
  write("TODO.md", "# TODO\n");
  write("package.json", '{ "name": "tmp", "private": true }\n');
  write(".gitignore", "node_modules\n.claude/worktrees\n.boucle\n");
  await git(["add", "-A"]);
  await git(["commit", "-m", "init"]);
  await git(["remote", "add", "origin", origin]);
  await git(["push", "-u", "origin", "master"]);
  return { cwd, origin, git, write, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
