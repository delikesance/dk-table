// @vitest-environment node
/** Cablage reel de la boucle (fichiers du dossier, pas de faux HTML): /, /design.html, /moodboard.html repondent 200. */
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { listen } from "./server";
import { buildBoucleServer } from "./wiring";

const servers: Server[] = [];
afterEach(() => { servers.splice(0).forEach((s) => s.close()); });

describe("buildBoucleServer", () => {
  it("sert le panneau, design.html et moodboard.html depuis le dossier du code (pas du cwd)", async () => {
    process.chdir(process.env.TEMP ?? "/");
    const server = buildBoucleServer({
      query: () => (async function* () {})(), run: async () => ({ code: 0, out: "" }), env: {}, cwd: process.cwd(),
    });
    servers.push(server);
    await listen(server, 0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    for (const [path, marker] of [["/", "Go"], ["/design.html", "Design"], ["/moodboard.html", "Moodboard"]]) {
      const r = await fetch(base + path, { headers: { accept: "text/html" } });
      expect([path, r.status]).toEqual([path, 200]);
      expect(await r.text()).toContain(marker);
    }
  });
});
