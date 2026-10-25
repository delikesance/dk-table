/**
 * Harnais e2e de la Boucle : vrai serveur HTTP, vrai git (depot temporaire + distant bare), faux agents.
 *
 * Quoi : `startBoucle({ ideas, script, env })` cree le depot, le serveur (`buildBoucleServer`) sur un port libre
 *        et rend `{ base, repo, events, go, stop, waitDone }`. npm/npx sont factices (`checks`), git est reel.
 * Pourquoi : tester le cablage complet (pipeline, fusion, push, tableau, SSE) sans jeton OAuth ni installation.
 * Usage : `const b = await startBoucle({ ideas }); await b.go(5); await b.waitDone();`.
 */
import type { AddressInfo } from "node:net";
import { buildBoucleServer } from "../../prototypes/oauth-sdk/wiring";
import { listen, type BoucleEvent } from "../../prototypes/oauth-sdk/server";
import type { Run } from "../../prototypes/oauth-sdk/git";
import { fakeQuery, type Script } from "./fakeAgent";
import { makeRepo, sh, type Idea, type TestRepo } from "./repo";

/** Verification factice : `npm test` / `npx tsc` dans un dossier (code 0 = vert). */
export type Checks = (cmd: "npm test" | "npx tsc", dir: string) => Promise<{ code: number; out: string }> | { code: number; out: string };

/** Options du harnais. */
export interface BoucleOpts {
  ideas: Idea[];
  /** Depot existant (redemarrage du serveur); non supprime a la fermeture. */
  repo?: TestRepo;
  script?: Script;
  env?: Record<string, string>;
  checks?: Checks;
  /** Pousser developpement apres chaque fusion (defaut: oui, vers le distant bare). */
  push?: boolean;
}

/** Instance en marche. */
export interface Boucle {
  base: string;
  repo: TestRepo;
  /** Evenements recus par un client SSE ouvert des le debut. */
  events: BoucleEvent[];
  go: (budgetEur: number) => Promise<Response>;
  stop: () => Promise<Response>;
  /** Attend l'evenement `done` (le suivant s'il y en a deja eu un avant). */
  waitDone: (ms?: number) => Promise<BoucleEvent>;
  close: () => Promise<void>;
}

/** Demarre le depot, le serveur et l'ecoute SSE. */
export async function startBoucle(o: BoucleOpts): Promise<Boucle> {
  const repo = o.repo ?? await makeRepo(o.ideas);
  const run: Run = async (cmd, args, cwd) => {
    const dir = cwd ?? repo.cwd;
    if (cmd === "git") return sh("git", args, dir);
    if (cmd === "npm" && args[0] === "ci") return { code: 0, out: "" };
    if (cmd === "npm" && args[0] === "test") return (await o.checks?.("npm test", dir)) ?? { code: 0, out: "" };
    if (cmd === "npx" && args[0] === "tsc") return (await o.checks?.("npx tsc", dir)) ?? { code: 0, out: "" };
    return { code: 0, out: "" };
  };
  const env = { BOUCLE_RESEARCH_MIN: "1", BOUCLE_PARALLEL: "3", ...o.env };
  const server = buildBoucleServer({ query: fakeQuery(o.script), run, env, cwd: repo.cwd, push: o.push ?? true });
  await listen(server, 0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const events: BoucleEvent[] = [];
  const ac = new AbortController();
  let doneCount = 0, waiters: (() => void)[] = [];
  void (async () => {
    const res = await fetch(base + "/events", { signal: ac.signal }).catch(() => null);
    if (!res?.body) return;
    const rd = res.body.getReader(), dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await rd.read().catch(() => ({ value: undefined, done: true }));
      if (done) return;
      buf += dec.decode(value);
      let i: number;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
        if (!chunk.startsWith("data: ")) continue;
        const e = JSON.parse(chunk.slice(6)) as BoucleEvent;
        events.push(e);
        if (e.type === "done") { doneCount++; waiters.forEach((w) => w()); waiters = []; }
      }
    }
  })();
  const waitDone = async (ms = 60_000): Promise<BoucleEvent> => {
    const want = doneCount + 1;
    const t0 = Date.now();
    while (doneCount < want) {
      if (Date.now() - t0 > ms) throw new Error(`boucle non terminee apres ${ms} ms (${events.length} evenements)`);
      await new Promise<void>((r) => { waiters.push(r); setTimeout(r, 200); });
    }
    return events.filter((e) => e.type === "done").at(-1)!;
  };
  return {
    base, repo, events, waitDone,
    go: (budgetEur) => fetch(base + "/go", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ budgetEur }) }),
    stop: () => fetch(base + "/stop", { method: "POST" }),
    close: async () => { ac.abort(); const closed = new Promise<void>((r) => server.close(() => r())); server.closeAllConnections(); await closed; if (!o.repo) repo.cleanup(); },
  };
}
