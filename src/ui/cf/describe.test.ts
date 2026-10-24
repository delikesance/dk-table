/** French one-line summaries of conditional formatting rules (rule list of the dialog). */
import { describe, expect, it } from "vitest";
import { describeRule } from "./describe";
import type { CfRule } from "../../engine/cf/types";

const d = (p: Record<string, unknown>) => describeRule({ id: "x", range: "A1", format: {}, ...p } as CfRule);

describe("describeRule", () => {
  it("cell value rules", () => {
    expect(d({ type: "cell", op: "gt", a: "100" })).toBe("Valeur > 100");
    expect(d({ type: "cell", op: "ne", a: "oui" })).toBe("Valeur ≠ oui");
    expect(d({ type: "cell", op: "between", a: "1", b: "5" })).toBe("Valeur entre 1 et 5");
    expect(d({ type: "cell", op: "notBetween", a: "1", b: "5" })).toBe("Valeur hors de 1 et 5");
  });
  it("text, flags, ranks, formulas, scales", () => {
    expect(d({ type: "text", op: "contains", text: "ok" })).toBe("Texte contenant « ok »");
    expect(d({ type: "blank" })).toBe("Cellules vides");
    expect(d({ type: "duplicate" })).toBe("Valeurs en double");
    expect(d({ type: "top", n: 10 })).toBe("10 valeurs les plus élevées");
    expect(d({ type: "bottom", n: 5, percent: true })).toBe("5 % des valeurs les plus basses");
    expect(d({ type: "aboveAvg" })).toBe("Au-dessus de la moyenne");
    expect(d({ type: "formula", formula: "=B1>0" })).toBe("Formule =B1>0");
    expect(d({ type: "scale", min: "#fff", max: "#00f" })).toBe("Échelle à 2 couleurs");
    expect(d({ type: "scale", min: "#fff", mid: "#ff0", max: "#00f" })).toBe("Échelle à 3 couleurs");
    expect(d({ type: "bar", color: "#00f" })).toBe("Barres de données");
  });
});
