/** Prouveur: ecrit rapports et TODO.md avec les preuves reelles, ignore les cartes sans rapport. */
import { describe, expect, it } from "vitest";
import { parseReport } from "./card";
import { createProver } from "./proveCards";

const REPORT = "# Rapport : Tri\nVisible : non\n\n## Fait\n- tri\n\n## Non fait\n- aucun\n";
function fs(files: Record<string, string>) {
  const writes: string[] = [];
  return { files, writes, read: (p: string) => files[p.replace(/\\/g, "/")] ?? null, write: (p: string, t: string) => { files[p.replace(/\\/g, "/")] = t; writes.push(p.replace(/\\/g, "/")); } };
}
const proof = { tests: { ok: true, count: 5, scope: "full" as const }, tsc: { ok: true } };

describe("createProver", () => {
  it("ecrit les preuves du rapport et coche TODO.md (une ecriture chacun)", async () => {
    const f = fs({ "/r/docs/rapports/tri.md": REPORT, "/r/TODO.md": "- [ ] Tri\n" });
    const ids = await createProver({ cwd: "/r", cards: [{ id: "tri", title: "Tri" }], ...f, exists: () => true })(proof);
    expect(ids).toEqual(["tri"]);
    expect(parseReport(f.files["/r/docs/rapports/tri.md"]).proof?.tests.count).toBe(5);
    expect(f.files["/r/TODO.md"]).toBe("- [x] Tri\n");
    expect(f.writes).toHaveLength(2);
  });
  it("carte sans rapport ignoree; carte non terminee: TODO.md intact", async () => {
    const f = fs({ "/r/docs/rapports/b.md": REPORT.replace("- aucun", "- reste a faire"), "/r/TODO.md": "- [ ] B\n" });
    const ids = await createProver({ cwd: "/r", cards: [{ id: "a", title: "A" }, { id: "b", title: "B" }], ...f, exists: () => true })(proof);
    expect(ids).toEqual(["b"]);
    expect(f.files["/r/TODO.md"]).toBe("- [ ] B\n");
    expect(f.writes).toEqual(["/r/docs/rapports/b.md"]);
  });
});
