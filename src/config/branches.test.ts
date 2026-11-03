import { describe, expect, it } from "vitest";
import ci from "../../.github/workflows/ci.yml?raw";
import release from "../../.github/workflows/release.yml?raw";

/** Bloc `on:` d'un workflow (du `on:` jusqu'à `jobs:`). */
const onBlock = (y: string) => y.slice(y.indexOf("\non:"), y.indexOf("\njobs:"));

/** Stratégie de branches : PR vers `développement`, build/publication au merge sur `master`. */
describe("stratégie de branches (CI/CD)", () => {
  it("CI rapide : tout push sauf master, rien d'autre", () => {
    const on = onBlock(ci);
    expect(on).toMatch(/push:\s*\n\s+branches-ignore: \[master\]/);
    expect(on).not.toMatch(/tags:|workflow_dispatch/);
  });

  it("release : se déclenche sur push master (plus sur les tags)", () => {
    const on = onBlock(release);
    expect(on).toMatch(/push:\s*\n\s+branches: \[master\]/);
    expect(on).not.toMatch(/tags:|pull_request/);
  });

  it("release : jobs Linux et Windows conservés", () => {
    expect(release).toMatch(/^\s{2}build-linux:/m);
    expect(release).toMatch(/^\s{2}build-windows:/m);
    expect(release).toMatch(/runs-on:\s*windows-latest/);
    expect(release).toMatch(/--bundles msi,nsis/);
    expect(release).toMatch(/bundle\/msi\/\*\.msi/);
    expect(release).toMatch(/bundle\/nsis\/\*\.exe/);
  });

  it("release : publication après les deux builds, uniquement sur master", () => {
    expect(release).toMatch(/^\s{2}publish:/m);
    expect(release).toMatch(/needs: \[build-linux, build-windows\]/);
    expect(release).toMatch(/contents: write/);
    expect(release).toMatch(/gh release create/);
  });
});
