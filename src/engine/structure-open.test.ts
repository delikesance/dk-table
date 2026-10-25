/** Insert/delete rows and columns on open-ended ranges. */
import { describe, expect, it } from "vitest";
import { rewriteFormula, type StructEdit } from "./structure";

const row = (at: number, n: number): StructEdit => ({ axis: "row", at, n });
const col = (at: number, n: number): StructEdit => ({ axis: "col", at, n });
const f = (s: string, e: StructEdit) => rewriteFormula(s, e);

describe("structural edits, open ranges", () => {
  it("B2:B: the start moves with rows, the open end stays", () => {
    expect(f("=SUM(B2:B)", row(1, 2))).toBe("=SUM(B4:B)");
    expect(f("=SUM(B2:B)", row(5, 2))).toBe("=SUM(B2:B)");
    expect(f("=SUM(B3:B)", row(2, -3))).toBe("=SUM(B2:B)");
  });
  it("B2:B and B:B move with columns", () => {
    expect(f("=SUM(B2:B)", col(1, 1))).toBe("=SUM(C2:C)");
    expect(f("=SUM(B:C)", col(2, 1))).toBe("=SUM(C:D)");
    expect(f("=SUM(B:C)", col(2, -1))).toBe("=SUM(B:B)");
    expect(f("=SUM(B:B)", col(2, -1))).toBe("=SUM(#REF!)");
  });
  it("whole columns ignore row edits, whole rows ignore column edits", () => {
    expect(f("=SUM(B:B)", row(1, 3))).toBe("=SUM(B:B)");
    expect(f("=SUM(2:3)", col(1, 3))).toBe("=SUM(2:3)");
  });
  it("whole rows move and shrink with row edits", () => {
    expect(f("=SUM(2:5)", row(1, 1))).toBe("=SUM(3:6)");
    expect(f("=SUM(2:5)", row(3, -1))).toBe("=SUM(2:4)");
    expect(f("=SUM(2:2)", row(2, -1))).toBe("=SUM(#REF!)");
  });
  it("keeps $ and leaves other-sheet refs alone", () => {
    expect(f("=SUM($B$2:$B)", row(1, 1))).toBe("=SUM($B$3:$B)");
    expect(f("=SUM(S!B2:B)", row(1, 1))).toBe("=SUM(S!B2:B)");
  });
});
