// @vitest-environment jsdom
/** Mises à jour: sans effet hors Tauri, toast « Installer », progression, « Redémarrer », messages manuels. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { App } from "./appTypes";

const check = vi.fn();
const relaunch = vi.fn();
vi.mock("@tauri-apps/plugin-updater", () => ({ check: () => check() }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: () => relaunch() }));

import { checkForUpdate } from "./updater";

const app = (dirty = false) => ({ dirty }) as unknown as App;
const toast = () => document.querySelector(".dk-toast")?.textContent ?? "";
const click = () => (document.querySelector(".dk-toast button") as HTMLButtonElement).click();
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => { check.mockReset(); relaunch.mockReset(); document.body.innerHTML = ""; });
afterEach(() => { delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__; });
const tauri = () => { (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {}; };

describe("checkForUpdate", () => {
  it("ne fait rien hors de Tauri", async () => {
    await checkForUpdate(app(), { silent: false });
    expect(check).not.toHaveBeenCalled();
    expect(toast()).toBe("");
  });
  it("à jour: silencieux au démarrage, annoncé en manuel", async () => {
    tauri(); check.mockResolvedValue(null);
    await checkForUpdate(app(), { silent: true });
    expect(toast()).toBe("");
    await checkForUpdate(app(), { silent: false });
    expect(toast()).toContain("à jour");
  });
  it("erreur: ignorée au démarrage, annoncée en manuel", async () => {
    tauri(); check.mockRejectedValue(new Error("réseau"));
    await checkForUpdate(app(), { silent: true });
    expect(toast()).toBe("");
    await checkForUpdate(app(), { silent: false });
    expect(toast()).toContain("Impossible de vérifier");
  });
  it("version disponible: Installer télécharge puis propose Redémarrer (relaunch seulement sur clic)", async () => {
    tauri();
    const downloadAndInstall = vi.fn(async (cb: (e: unknown) => void) => {
      cb({ event: "Started", data: { contentLength: 100 } });
      cb({ event: "Progress", data: { chunkLength: 50 } });
      cb({ event: "Finished" });
    });
    check.mockResolvedValue({ version: "9.9.9", downloadAndInstall });
    await checkForUpdate(app(), { silent: true });
    expect(toast()).toContain("Version 9.9.9 disponible");
    click(); await flush(); await flush();
    expect(downloadAndInstall).toHaveBeenCalledOnce();
    expect(toast()).toContain("installée");
    expect(relaunch).not.toHaveBeenCalled();
    click(); await flush(); await flush();
    expect(relaunch).toHaveBeenCalledOnce();
  });
  it("document modifié: le message prévient avant le redémarrage", async () => {
    tauri();
    check.mockResolvedValue({ version: "9.9.9", downloadAndInstall: async () => {} });
    await checkForUpdate(app(true), { silent: true });
    click(); await flush(); await flush();
    expect(toast()).toContain("enregistrez vos modifications");
  });
  it("échec du téléchargement: message d'erreur, pas de redémarrage", async () => {
    tauri();
    check.mockResolvedValue({ version: "9.9.9", downloadAndInstall: async () => { throw new Error("x"); } });
    await checkForUpdate(app(), { silent: true });
    click(); await flush(); await flush();
    expect(toast()).toContain("Échec");
    expect(relaunch).not.toHaveBeenCalled();
  });
});
