import { describe, expect, it } from "vitest";
import capRaw from "../../src-tauri/capabilities/default.json?raw";
import libRs from "../../src-tauri/src/lib.rs?raw";
import cargo from "../../src-tauri/Cargo.toml?raw";

type Perm = string | { identifier: string; allow?: { path: string }[] };
const cap = JSON.parse(capRaw) as { permissions: Perm[] };
const scoped = (id: string) =>
  (cap.permissions.find((p) => typeof p !== "string" && p.identifier === id) as
    | { allow?: { path: string }[] }
    | undefined)?.allow?.map((a) => a.path) ?? [];

/** fs scope: user documents must be readable/writable, and dialog choices persisted. */
describe("tauri fs scope", () => {
  for (const id of ["fs:allow-read-text-file", "fs:allow-write-text-file"]) {
    it(`${id} allows the user folders`, () => {
      const paths = scoped(id);
      for (const dir of ["$DOCUMENT", "$DESKTOP", "$DOWNLOAD", "$HOME"])
        expect(paths).toContain(`${dir}/**`);
    });
  }

  it("persists the scope granted by the dialog (files outside user folders, recents)", () => {
    expect(cargo).toMatch(/tauri-plugin-persisted-scope/);
    expect(libRs).toMatch(/tauri_plugin_persisted_scope::init\(\)/);
  });
});
