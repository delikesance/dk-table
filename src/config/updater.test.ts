import { describe, expect, it } from "vitest";
import release from "../../.github/workflows/release.yml?raw";
import conf from "../../src-tauri/tauri.conf.json";
import caps from "../../src-tauri/capabilities/default.json";

/** Mises à jour automatiques: config Tauri (clé publique, endpoint), signature en CI et latest.json de la release. */
describe("updater: configuration Tauri", () => {
  const u = (conf as { plugins?: { updater?: { pubkey?: string; endpoints?: string[] } } }).plugins?.updater;
  it("clé publique et endpoint vers le latest.json de la dernière release", () => {
    expect(u?.pubkey?.length).toBeGreaterThan(40);
    expect(u?.endpoints).toEqual(["https://github.com/delikesance/dk-table/releases/latest/download/latest.json"]);
  });
  it("le bundle produit les artefacts signés de l'updater", () => {
    expect((conf as { bundle: { createUpdaterArtifacts?: boolean } }).bundle.createUpdaterArtifacts).toBe(true);
  });
  it("la fenêtre peut vérifier, installer et redémarrer", () => {
    expect(caps.permissions).toEqual(expect.arrayContaining(["updater:default", "process:allow-restart"]));
  });
});

describe("updater: workflow de release", () => {
  it("les deux builds sont signés avec la clé privée des secrets", () => {
    expect(release.match(/TAURI_SIGNING_PRIVATE_KEY: \$\{\{ secrets\.TAURI_SIGNING_PRIVATE_KEY \}\}/g)).toHaveLength(2);
    expect(release).toMatch(/TAURI_SIGNING_PRIVATE_KEY_PASSWORD: \$\{\{ secrets\.TAURI_SIGNING_PRIVATE_KEY_PASSWORD \}\}/);
  });
  it("les signatures (.sig) sont transmises au job de publication", () => {
    expect(release).toMatch(/\*\.AppImage\.sig/);
    expect(release).toMatch(/\*\.exe\.sig/);
  });
  it("latest.json (Linux AppImage + Windows nsis) est généré puis joint à la release", () => {
    expect(release).toMatch(/"linux-x86_64"/);
    expect(release).toMatch(/"windows-x86_64"/);
    expect(release).toMatch(/gh release create "v\$\{version\}" dist\/\*\/\* latest\.json/);
  });
});
