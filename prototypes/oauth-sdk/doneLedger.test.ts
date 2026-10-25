// @vitest-environment node
/** Registre des cartes terminees : append-only, durable (fichier), jamais perdu par une nouvelle tournee, un redemarrage ou un nouveau Go. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildBoard, cardDetail, reportPath } from "./cards";
import { createFileLedger, createMemoryLedger } from "./doneLedger";
import type { QueryFn } from "./research";

const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

const MD = "## Idees nouvelles\n\n- **Beta idee** : deuxieme. Texte.\n- **Alpha idee** : premiere.\n";
const REPORT = "# Rapport : Beta\nStatut : termine\n\n## Fait\n- ok\n\n## Preuves\n- Tests : ok (12)\n<!-- boucle-proof {\"tests\":{\"ok\":true,\"count\":12},\"tsc\":{\"ok\":true}} -->\n- Captures : docs/screenshots/b/a.png\n";
const query = (() => (async function* () {})()) as QueryFn;
const exists = async () => true;
/** Depot simule: fichiers lisibles, modifiables entre deux tournees. */
const repo = (files: Record<string, string>) => async (p: string) => { if (!(p in files)) throw new Error("absent"); return files[p]; };

describe("cartes terminees durables", () => {
  it("une carte terminee reste terminee quand l'idee disparait de la liste (liste regeneree, TODO [x])", async () => {
    const ledger = createMemoryLedger();
    const files = { "docs/recherche/fonctionnalites.md": MD, "TODO.md": "", [reportPath("beta-idee")]: REPORT };
    const first = await buildBoard({ readFile: repo(files), query, exists, ledger });
    expect(first.find((c) => c.id === "beta-idee")?.state).toBe("termine");
    // tournee suivante: liste d'idees regeneree sans Beta, TODO a [x], rapport supprime du disque
    const next = { "docs/recherche/fonctionnalites.md": "## Idees nouvelles\n\n- **Alpha idee** : premiere.\n", "TODO.md": "- [x] Beta idee faite\n" };
    const second = await buildBoard({ readFile: repo(next), query, exists, ledger });
    const beta = second.find((c) => c.id === "beta-idee");
    expect(beta?.state).toBe("termine");
    expect(beta?.title).toBe("Beta idee");
    expect(beta?.report?.done).toEqual(["ok"]);
    expect(second.filter((c) => c.id === "beta-idee")).toHaveLength(1);
  });

  it("le rapport reste lisible (cardDetail) apres suppression du fichier", async () => {
    const ledger = createMemoryLedger();
    await buildBoard({ readFile: repo({ "docs/recherche/fonctionnalites.md": MD, "TODO.md": "", [reportPath("beta-idee")]: REPORT }), query, exists, ledger });
    const d = await cardDetail("beta-idee", async () => null, async () => true, ledger);
    expect(d?.markdown).toBe(REPORT);
    expect(d?.state).toBe("termine");
  });

  it("un rapport devenu incomplet ou une carte repassee en cours ne la retire pas des terminees", async () => {
    const ledger = createMemoryLedger();
    const base = { "docs/recherche/fonctionnalites.md": MD, "TODO.md": "" };
    await buildBoard({ readFile: repo({ ...base, [reportPath("beta-idee")]: REPORT }), query, exists, ledger });
    const again = await buildBoard({ readFile: repo({ ...base, [reportPath("beta-idee")]: "# Rapport : Beta\nStatut : en-cours\n" }), query, exists, ledger });
    expect(again.find((c) => c.id === "beta-idee")?.state).toBe("termine");
  });

  it("survit a un redemarrage: registre fichier append-only relu par une nouvelle instance", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ledger-")); dirs.push(dir);
    const file = join(dir, ".boucle", "termines.jsonl");
    await buildBoard({ readFile: repo({ "docs/recherche/fonctionnalites.md": MD, "TODO.md": "", [reportPath("beta-idee")]: REPORT }), query, exists, ledger: createFileLedger(file) });
    const lines = readFileSync(file, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    // redemarrage: nouvelle instance, depot vide
    const after = await buildBoard({ readFile: repo({}), query, exists, ledger: createFileLedger(file) });
    expect(after.map((c) => [c.id, c.state])).toEqual([["beta-idee", "termine"]]);
    // nouveau Go: rien n'est reecrit en double
    await buildBoard({ readFile: repo({ "docs/recherche/fonctionnalites.md": MD, "TODO.md": "", [reportPath("beta-idee")]: REPORT }), query, exists, ledger: createFileLedger(file) });
    expect(readFileSync(file, "utf8").trim().split("\n")).toHaveLength(1);
  });

  it("un fichier abime (ligne tronquee, CRLF) n'efface rien et ne fait pas lever", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ledger-")); dirs.push(dir);
    const file = join(dir, "t.jsonl");
    const e = { id: "x-idee", title: "X idee", summary: "s", source: "src", reportPath: "docs/rapports/x-idee.md", markdown: REPORT, doneAt: 1 };
    writeFileSync(file, `${JSON.stringify(e)}\r\n{"id":"tronq\r\n`);
    const all = await createFileLedger(file).load();
    expect(all.map((x) => x.id)).toEqual(["x-idee"]);
  });
});
