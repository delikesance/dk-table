import { describe, expect, it } from "vitest";
import { FakeGhClient, RealGhClient } from "../github";

const rec = (out: string) => {
  const calls: [string, string[]][] = [];
  return { calls, exec: async (f: string, a: string[]) => (calls.push([f, a]), out) };
};

describe("RealGhClient", () => {
  it("liste via gh sans shell et normalise les labels", async () => {
    const r = rec(JSON.stringify([{ number: 4, title: "t", body: "b", state: "CLOSED", labels: [{ name: "auto:bug" }] }]));
    const issues = await new RealGhClient(r.exec).listIssues("label:auto:bug");
    expect(r.calls[0][0]).toBe("gh");
    expect(r.calls[0][1]).toEqual(expect.arrayContaining(["issue", "list", "--search", "label:auto:bug", "--state", "all"]));
    expect(issues).toEqual([{ number: 4, title: "t", body: "b", state: "closed", labels: ["auto:bug"] }]);
  });
  it("crée une issue et renvoie son numéro", async () => {
    const r = rec("https://github.com/o/r/issues/42\n");
    const n = await new RealGhClient(r.exec).createIssue("T", "B", ["auto:bug"]);
    expect(n).toBe(42);
    expect(r.calls[0][1]).toEqual(["issue", "create", "--title", "T", "--body", "B", "--label", "auto:bug"]);
  });
});

describe("FakeGhClient", () => {
  it("filtre par label: et enregistre les créations", async () => {
    const f = new FakeGhClient([{ number: 1, title: "a", body: "", state: "open", labels: ["auto:rejected"] }]);
    expect(await f.listIssues("label:auto:bug")).toHaveLength(0);
    expect(await f.listIssues("label:auto:rejected")).toHaveLength(1);
    const n = await f.createIssue("T", "B", ["auto:bug"]);
    expect(n).toBeGreaterThan(1);
    expect(f.created).toHaveLength(1);
  });
});
