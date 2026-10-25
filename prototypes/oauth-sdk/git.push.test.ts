// @vitest-environment node
/** Push automatique de `developpement` apres fusion validee: depot distant factice (bare), rejets, conflits, jamais master. */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGitFlow, type Run } from "./git";

// vrais processus git: des dizaines de ms sous Linux mais des secondes sous Windows quand toute la suite tourne en parallele
vi.setConfig({ testTimeout: 60_000 });
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const g = (cwd: string, ...a: string[]) => execFileSync("git", ["-c", "user.email=a@b", "-c", "user.name=a", "-c", "gc.auto=0", "-c", "core.fsync=none", ...a], { cwd, encoding: "utf8" }).trim();
// identite par l'environnement: le pull qui cree un commit de fusion echoue sans identite (CI, machine neuve)
const ident = { GIT_AUTHOR_NAME: "a", GIT_AUTHOR_EMAIL: "a@b", GIT_COMMITTER_NAME: "a", GIT_COMMITTER_EMAIL: "a@b" };
const run: Run = async (cmd, args, cwd) => { const r = spawnSync(cmd, args, { cwd, encoding: "utf8", env: { ...process.env, ...ident } }); return { code: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") }; };
const commit = (cwd: string, file: string, text: string) => { writeFileSync(join(cwd, file), text); g(cwd, "add", "-A"); g(cwd, "commit", "-qm", `c ${file}`); };

/** Depot distant bare + deux clones sur developpement. */
function setup() {
  const root = mkdtempSync(join(tmpdir(), "push-")); dirs.push(root);
  const remote = join(root, "remote.git"), a = join(root, "a"), b = join(root, "b");
  g(root, "init", "-q", "--bare", "-b", "master", remote);
  g(root, "clone", "-q", remote, a);
  commit(a, "f", "1"); g(a, "branch", "-M", "master"); g(a, "push", "-q", "origin", "master");
  g(a, "checkout", "-q", "-b", "developpement"); g(a, "push", "-q", "-u", "origin", "developpement");
  g(root, "clone", "-q", "-b", "developpement", remote, b);
  return { remote, a, b };
}

describe("pushDev", () => {
  it("pousse developpement vers origin", async () => {
    const { remote, a } = setup();
    commit(a, "x", "x");
    const r = await createGitFlow(run, a, { push: true }).pushDev();
    expect(r).toMatchObject({ pushed: true });
    expect(g(remote, "rev-parse", "developpement")).toBe(g(a, "rev-parse", "HEAD"));
  });
  it("distant en avance (push rejete): integre le distant puis repousse, rien n'est perdu", async () => {
    const { remote, a, b } = setup();
    commit(b, "autre", "b"); g(b, "push", "-q", "origin", "developpement");
    commit(a, "x", "x");
    const r = await createGitFlow(run, a, { push: true }).pushDev();
    expect(r.pushed).toBe(true);
    const log = g(remote, "log", "--format=%s", "developpement");
    expect(log).toMatch(/c x/); expect(log).toMatch(/c autre/);
  });
  it("conflit avec le distant: pas de push, fusion annulee, raison claire pour le journal", async () => {
    const { a, b } = setup();
    commit(b, "f", "distant"); g(b, "push", "-q", "origin", "developpement");
    commit(a, "f", "local");
    const r = await createGitFlow(run, a, { push: true }).pushDev();
    expect(r.pushed).toBe(false);
    expect(r.reason).toMatch(/conflit/i);
    expect(g(a, "status", "--porcelain")).toBe("");        // arbre propre (merge --abort)
    expect(g(a, "log", "-1", "--format=%s")).toBe("c f");
  });
  it("jamais master ni main: refuse si la branche courante n'est pas developpement", async () => {
    const { remote, a } = setup();
    g(a, "checkout", "-q", "master"); commit(a, "m", "m");
    const r = await createGitFlow(run, a, { push: true }).pushDev();
    expect(r.pushed).toBe(false);
    expect(g(remote, "rev-parse", "master")).not.toBe(g(a, "rev-parse", "HEAD"));
  });
  it("desactive (push: false) ou sans remote: rien n'est pousse, raison explicite", async () => {
    const { remote, a } = setup();
    commit(a, "x", "x");
    expect((await createGitFlow(run, a).pushDev())).toMatchObject({ pushed: false, reason: expect.stringMatching(/desactive/) });
    expect(g(remote, "rev-parse", "developpement")).not.toBe(g(a, "rev-parse", "HEAD"));
    g(a, "remote", "remove", "origin");
    expect((await createGitFlow(run, a, { push: true }).pushDev()).reason).toMatch(/origin/);
  });
});
