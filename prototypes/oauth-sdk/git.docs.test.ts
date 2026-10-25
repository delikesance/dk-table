// @vitest-environment node
/** commitDocs : commit identifiable `[boucle-docs]` sur developpement, sans verification (fichier meta). */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { createGitFlow, isMeta, type Run } from "./git";
import { gitEnv } from "./testUtil";

const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const env = gitEnv();
const g = (cwd: string, ...a: string[]) => execFileSync("git", a, { cwd, encoding: "utf8", env }).trim();
const run: Run = async (cmd, args, cwd) => { const r = spawnSync(cmd, args, { cwd, encoding: "utf8", env }); return { code: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") }; };

it("ecrit et commite le document sur developpement; le commit est identifiable et le fichier est meta", async () => {
  const repo = mkdtempSync(join(tmpdir(), "docs-")); dirs.push(repo);
  g(repo, "init", "-q", "-b", "developpement"); writeFileSync(join(repo, "a.txt"), "a"); g(repo, "add", "-A"); g(repo, "commit", "-qm", "init");
  const flow = createGitFlow(run, repo);
  const hash = await flow.commitDocs([{ path: "docs/recherche/fonctionnalites.md", text: "# R\n" }], "Boucle: decoupe");
  expect(hash).toMatch(/^[0-9a-f]+$/);
  expect(readFileSync(join(repo, "docs/recherche/fonctionnalites.md"), "utf8")).toBe("# R\n");
  expect(g(repo, "log", "-1", "--format=%s")).toContain("[boucle-docs]");
  expect(g(repo, "status", "--porcelain")).toBe("");
  expect(isMeta("docs/recherche/fonctionnalites.md")).toBe(true);
  expect(await flow.commitDocs([], "x")).toBeNull();
});
