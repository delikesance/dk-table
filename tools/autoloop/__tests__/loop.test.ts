import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../config";
import { nextAction, type LoopState } from "../loop";

const s = (o: Partial<LoopState> = {}): LoopState => ({
  stopFile: false, budgetOk: true, iteration: 0, idleCycles: 0, openPrs: 0, bugQueue: 0,
  masterSha: "a", lastAuditSha: "a", featureBacklog: 0, researchDue: false, ...o,
});
const kind = (o: Partial<LoopState>) => nextAction(s(o), DEFAULT_CONFIG).kind;

describe("nextAction", () => {
  it("stop: fichier STOP, budget, itérations, cycles sans nouveauté", () => {
    expect(nextAction(s({ stopFile: true }), DEFAULT_CONFIG)).toEqual({ kind: "stop", reason: "stop-file" });
    expect(nextAction(s({ budgetOk: false }), DEFAULT_CONFIG)).toEqual({ kind: "stop", reason: "budget" });
    expect(nextAction(s({ iteration: DEFAULT_CONFIG.maxIterations }), DEFAULT_CONFIG)).toEqual({ kind: "stop", reason: "iterations" });
    expect(nextAction(s({ idleCycles: 3 }), DEFAULT_CONFIG)).toEqual({ kind: "stop", reason: "idle" });
  });
  it("garde-fous avant tout le reste", () => {
    expect(kind({ stopFile: true, openPrs: 2, bugQueue: 1 })).toBe("stop");
  });
  it("PR ouvertes avant les bugs", () => {
    expect(kind({ openPrs: 1, bugQueue: 2 })).toBe("handle-prs");
  });
  it("bugs avant audit", () => {
    expect(kind({ bugQueue: 1, masterSha: "b" })).toBe("fix-bug");
  });
  it("audit si file vide et SHA master changé", () => {
    expect(kind({ masterSha: "b" })).toBe("audit");
  });
  it("features si 0 bug et SHA déjà audité", () => {
    expect(kind({ featureBacklog: 2 })).toBe("feature");
  });
  it("R&D rare, sinon idle", () => {
    expect(kind({ researchDue: true })).toBe("research");
    expect(kind({})).toBe("idle");
  });
});
