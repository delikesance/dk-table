import { describe, expect, it } from "vitest";
import { parseArgs, runDry } from "../main";

describe("parseArgs", () => {
  it("dry-run par défaut", () => {
    expect(parseArgs([]).dryRun).toBe(true);
  });
  it("lit --env-file et --live", () => {
    const a = parseArgs(["--env-file", ".env", "--live"]);
    expect(a.envFile).toBe(".env");
    expect(a.dryRun).toBe(false);
  });
});

describe("runDry", () => {
  it("termine sur un critère d'arrêt sans appel réel", async () => {
    const r = await runDry({ stopFile: () => false, log: () => {}, append: () => {} });
    expect(["idle", "budget", "iterations"]).toContain(r.reason);
    expect(r.actions[0]).toBe("audit");
  });
  it("respecte le fichier STOP", async () => {
    const r = await runDry({ stopFile: () => true, log: () => {}, append: () => {} });
    expect(r.reason).toBe("stop-file");
  });
});
