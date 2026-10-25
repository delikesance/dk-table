// @vitest-environment node
/** Cablage reel: un run complet (faux modele et fausses commandes) laisse un journal technique et un diagnostic, sans secret. */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { listen } from "./server";
import { buildBoucleServer } from "./wiring";

const servers: Server[] = [];
afterEach(() => { servers.splice(0).forEach((s) => s.close()); });
const TOKEN = "sk-ant-oat01-SECRETSECRETSECRET99";

describe("journal technique du cablage", () => {
  it("run -> /logs (commandes, modele, evenements), /diagnostic, aucun secret", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "wlg-"));
    const server = buildBoucleServer({
      cwd, env: { CLAUDE_CODE_OAUTH_TOKEN: TOKEN, BOUCLE_LOG: "debug", BOUCLE_PUSH: "0" }, push: false,
      query: () => (async function* () { yield { type: "result", subtype: "success", result: "- a", total_cost_usd: 0.01 }; })(),
      run: async (cmd, args) => ({ code: cmd === "git" && args[0] === "status" ? 0 : 0, out: cmd === "npm" ? `ok ${TOKEN}` : "" }),
    });
    servers.push(server); await listen(server, 0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const es = await fetch(base + "/events"); const rd = es.body!.getReader();
    await fetch(base + "/go", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ budgetEur: 5 }) });
    let text = "";
    const t0 = Date.now();
    while (!text.includes('"type":"done"') && Date.now() - t0 < 25000) text += new TextDecoder().decode((await rd.read()).value);
    await rd.cancel();
    expect(text).toContain("diagnostic :");
    const logs = await (await fetch(base + "/logs?level=debug")).json();
    const comps = new Set(logs.entries.map((e: { comp: string }) => e.comp));
    expect(comps.has("run")).toBe(true);
    expect(comps.has("modele") || comps.has("cmd")).toBe(true);
    expect(JSON.stringify(logs)).not.toContain("SECRETSECRET");
    const diag = await (await fetch(base + "/diagnostic")).text();
    expect(diag).toContain("# Diagnostic du run");
    expect(diag).not.toContain("SECRETSECRET");
  }, 30000);
});
