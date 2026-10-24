import { describe, expect, it } from "vitest";
import confRaw from "../../src-tauri/tauri.conf.json?raw";
import release from "../../.github/workflows/release.yml?raw";
const conf = JSON.parse(confRaw);
/** Linux packaging config: Tauri bundle targets + release workflow. */
describe("packaging linux", () => {
  it("bundle targets include deb and appimage", () => {
    const t = conf.bundle.targets;
    expect(Array.isArray(t)).toBe(true);
    expect(t).toEqual(expect.arrayContaining(["deb", "appimage"]));
  });

  it("keeps windows targets", () => {
    expect(conf.bundle.targets).toEqual(expect.arrayContaining(["msi", "nsis"]));
  });

  it("release workflow has a Linux build job running tauri build", () => {
    expect(release).toMatch(/^\s{2}build-linux:/m);
    expect(release).toMatch(/runs-on:\s*ubuntu-/);
    expect(release).toMatch(/tauri build/);
    expect(release).toMatch(/--bundles deb,appimage/);
  });

  it("release workflow uploads artifacts", () => {
    expect(release).toMatch(/actions\/upload-artifact/);
    expect(release).toMatch(/bundle\/deb/);
    expect(release).toMatch(/bundle\/appimage/);
  });
});
