// @vitest-environment node
/** Redemarrage de la Boucle: le serveur relit le registre et garde les cartes terminees (moodboard + rapport cliquable). */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { listen } from "./server";
import type { QueryFn } from "./research";
import { buildBoucleServer } from "./wiring";

const servers: Server[] = [];
const dirs: string[] = [];
afterEach(() => { servers.splice(0).forEach((s) => s.close()); for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

const REPORT = "# Rapport : Beta\nStatut : termine\n\n## Fait\n- ok\n\n## Preuves\n- Tests : ok (3)\n<!-- boucle-proof {\"tests\":{\"ok\":true,\"count\":12},\"tsc\":{\"ok\":true}} -->\n- Captures : docs/screenshots/b/a.png\n";
const query = (() => (async function* () {})()) as QueryFn;
const run = async () => ({ code: 1, out: "" });
async function start(cwd: string) {
  const s = buildBoucleServer({ query, run, env: {}, cwd });
  await listen(s, 0); servers.push(s);
  return `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
}

describe("redemarrage", () => {
  it("une carte terminee reste visible et son rapport lisible apres redemarrage, liste d'idees videe", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "boucle-")); dirs.push(cwd);
    for (const d of ["docs/recherche", "docs/rapports", "docs/screenshots/b"]) mkdirSync(join(cwd, d), { recursive: true });
    writeFileSync(join(cwd, "docs/recherche/fonctionnalites.md"), "## Idees nouvelles\n\n- **Beta idee** : deuxieme.\n");
    writeFileSync(join(cwd, "docs/rapports/beta-idee.md"), REPORT);
    writeFileSync(join(cwd, "docs/screenshots/b/a.png"), "x");
    const a = await start(cwd);
    const first = await (await fetch(a + "/moodboard")).json();
    expect(first.find((c: { id: string }) => c.id === "beta-idee").state).toBe("termine");
    // la liste d'idees est videe et le rapport supprime, puis la Boucle redemarre
    writeFileSync(join(cwd, "docs/recherche/fonctionnalites.md"), "## Idees nouvelles\n");
    rmSync(join(cwd, "docs/rapports/beta-idee.md"));
    const b = await start(cwd);
    const again = await (await fetch(b + "/moodboard")).json();
    expect(again.map((c: { id: string; state: string }) => [c.id, c.state])).toEqual([["beta-idee", "termine"]]);
    const rep = await (await fetch(b + "/reports/beta-idee")).json();
    expect(rep.markdown).toBe(REPORT);
    expect(rep.state).toBe("termine");
  });
});
