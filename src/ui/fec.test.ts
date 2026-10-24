// @vitest-environment jsdom
/** Tests for "Insérer les en-têtes FEC": writes A1:R1 in one step, refuses a non-empty row 1. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertFecHeaders } from "./fec";
import type { App } from "./appTypes";

const fakeApp = (cells: Record<string, { raw: string }>) => ({
  editMany: vi.fn(),
  activeDoc: () => ({ id: "s", name: "S", cols: 26, rows: 100, cells }),
}) as unknown as App;

beforeEach(() => { document.body.innerHTML = ""; });

describe("insertFecHeaders", () => {
  it("writes the 18 names in A1:R1 with one editMany call", () => {
    const app = fakeApp({ A2: { raw: "x" }, S1: { raw: "note" } });
    insertFecHeaders(app);
    expect(app.editMany).toHaveBeenCalledTimes(1);
    const cells = vi.mocked(app.editMany).mock.calls[0][0];
    expect(Object.keys(cells)).toHaveLength(18);
    expect(cells.A1).toBe("JournalCode");
    expect(cells.L1).toBe("Debit");
    expect(cells.R1).toBe("Idevise");
  });
  it("row 1 not empty: toast, nothing written", () => {
    const app = fakeApp({ C1: { raw: "x" } });
    insertFecHeaders(app);
    expect(app.editMany).not.toHaveBeenCalled();
    expect(document.querySelector(".dk-toast__msg")?.textContent).toBe("La ligne 1 n'est pas vide");
  });
});
