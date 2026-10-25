/** Diagnostic de fin de run: anomalies, cause probable, copiable dans le chat. */
import { describe, expect, it } from "vitest";
import { diagnose } from "./diagnostic";
import type { LogEntry } from "./logRead";

let ms = 0;
const E = (o: Partial<LogEntry>): LogEntry => ({ ts: "2026-01-01T00:00:00.000Z", ms: (ms += 1000), level: "info", comp: "x", run: "r1", msg: "m", ...o });

describe("diagnose", () => {
  it("run sain: resume sans anomalie", () => {
    const t = diagnose([E({ msg: "debut" }), E({ comp: "modele", msg: "appel", model: "haiku", costUsd: 0.1, turns: 3 })]);
    expect(t).toContain("# Diagnostic");
    expect(t).toMatch(/Aucune anomalie/);
    expect(t).toContain("haiku");
  });
  it("erreurs et refus de fusion: listes avec composant, carte et cause probable", () => {
    const t = diagnose([
      E({ comp: "git", level: "warn", msg: "fusion refusee", card: "texte", reason: "npm test failed (introduit par la branche): a.test.ts > x" }),
      E({ comp: "git", level: "warn", msg: "fusion refusee", card: "autre", reason: "Test timed out in 5000ms" }),
      E({ comp: "agent", level: "error", msg: "agent plante", agent: "c1", err: { message: "spawn ENOENT", stack: "Error: spawn ENOENT\n at x" } }),
    ]);
    expect(t).toMatch(/Anomalies \(3\)/);
    expect(t).toContain("texte");
    expect(t).toMatch(/regression|régression/i);
    expect(t).toMatch(/charge|timeout/i);
    expect(t).toMatch(/commande introuvable|ENOENT/);
  });
  it("coût total et par modèle; durée du run", () => {
    const t = diagnose([E({ comp: "modele", model: "haiku", costUsd: 0.2 }), E({ comp: "modele", model: "sonnet", costUsd: 0.5 }), E({ comp: "modele", model: "haiku", costUsd: 0.1 })]);
    expect(t).toContain("0,80");
    expect(t).toMatch(/haiku[^\n]*0,30/);
  });
  it("transitions de carte: celles qui repartent en arriere sont signalees", () => {
    const t = diagnose([E({ comp: "carte", msg: "transition", card: "a", from: "preuves", to: "termine" }), E({ comp: "carte", msg: "transition", card: "b", from: "termine", to: "idee", cause: "rapport perdu" })]);
    expect(t).toMatch(/b.*termine.*idee/s);
    expect(t).toContain("rapport perdu");
  });
  it("jamais de secret ni de sortie brute: texte court (< 6000 caracteres) meme avec 500 anomalies", () => {
    const es = Array.from({ length: 500 }, (_, i) => E({ level: "error", msg: "boum " + i, comp: "agent" }));
    expect(diagnose(es).length).toBeLessThan(6000);
  });
});
