import { describe, expect, it, vi } from "vitest";
import { exportDocFile } from "./docFiles";
import type { IoDeps } from "./files";

const deps = (over: Partial<IoDeps> = {}): IoDeps => ({
  open: vi.fn(), save: vi.fn(async () => "/x/rapport"), readTextFile: vi.fn(), writeTextFile: vi.fn(async () => {}), ...over,
});

describe("exportDocFile", () => {
  it("propose le nom du document, filtre par format et ajoute l'extension", async () => {
    const d = deps();
    expect(await exportDocFile("md", "# T", d)).toBe("/x/rapport.md");
    expect(d.save).toHaveBeenCalledWith({ filters: [{ name: "Markdown", extensions: ["md"] }] });
    expect(d.writeTextFile).toHaveBeenCalledWith("/x/rapport.md", "# T");
    expect(await exportDocFile("html", "<p>", deps({ save: async () => "/x/r.HTML" }))).toBe("/x/r.HTML");
  });
  it("n'écrit rien si l'utilisateur annule", async () => {
    const d = deps({ save: async () => null });
    expect(await exportDocFile("md", "x", d)).toBeNull();
    expect(d.writeTextFile).not.toHaveBeenCalled();
  });
});
