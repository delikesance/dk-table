/** Etape de qualification : doublons sans modele, un appel pour le lot, decoupe ecrite et commitee, repli sans jeton. */
import { describe, expect, it, vi } from "vitest";
import { createBudget } from "./budget";
import type { BoardCard } from "./cards";
import { createQualifier } from "./qualifyStep";
import type { QueryFn } from "./research";

const card = (id: string, title: string) => ({ id, title, source: "", summary: `r ${title}`, state: "idee" }) as BoardCard;
const answer = (cards: unknown[]): QueryFn => vi.fn(async function* () { yield { type: "result", subtype: "success", total_cost_usd: 0.01, result: "", structured_output: { cards } } as never; });
const base = (query: QueryFn, over = {}) => ({
  query, budget: createBudget(5), env: { CLAUDE_CODE_OAUTH_TOKEN: "t" }, read: async (p: string) => (p === "TODO.md" ? "- [x] Audit de modele integre\n" : "# R\n\n## Idees nouvelles\n\n- **Gros chantier** : x.\n"),
  doneTitles: async () => ["Profileur de recalcul formules"], commitDocs: vi.fn(async () => "abc1234"), emit: vi.fn(), ...over,
});

describe("createQualifier", () => {
  it("doublons ecartes sans modele; un seul appel pour les autres; la carte L est decoupee et commitee", async () => {
    const q = answer([{ id: "n", size: "S", decision: "implement", files: ["src/n.ts"], criteria: ["c"] }, { id: "g", size: "L", decision: "split", parts: ["Premier lot", "Second lot"] }]);
    const d = base(q);
    const r = await createQualifier(d)([card("t", "Audit de modèle intégré"), card("p", "Profileur de recalcul formules"), card("n", "Nouvelle chose"), card("g", "Gros chantier")]);
    expect(q).toHaveBeenCalledTimes(1);
    expect(String((q as ReturnType<typeof vi.fn>).mock.calls[0][0].prompt)).not.toContain("Audit de modèle");
    expect(r.selected.map((c) => c.id)).toEqual(["n"]);
    expect(r.selected[0].files).toEqual(["src/n.ts"]);
    expect(r.deferred.map((x) => `${x.id}:${x.kind}`)).toEqual(["t:duplicate", "p:duplicate", "g:split"]);
    const [files, msg] = d.commitDocs.mock.calls[0] as unknown as [{ path: string; text: string }[], string];
    expect(files[0].text).toContain("**Premier lot**");
    expect(msg).toContain("g");
    expect(d.emit).toHaveBeenCalledWith(expect.stringContaining("decoupee"));
  });
  it("sans jeton ou budget epuise : aucun appel, toutes les cartes non doublons partent", async () => {
    const q = answer([]);
    for (const over of [{ env: {} }, { budget: createBudget(0) }]) {
      const r = await createQualifier(base(q, over))([card("n", "Nouvelle chose")]);
      expect(r.selected.map((c) => c.id)).toEqual(["n"]);
    }
    expect(q).not.toHaveBeenCalled();
  });
  it("le cout est regle dans le budget partage", async () => {
    const d = base(answer([{ id: "n", size: "S", decision: "implement" }]));
    await createQualifier(d)([card("n", "Nouvelle chose")]);
    expect(d.budget.spent()).toBeCloseTo(0.01);
  });
});
