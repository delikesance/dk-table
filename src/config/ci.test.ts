import { describe, expect, it } from "vitest";
import fast from "../../.github/workflows/ci.yml?raw";
import full from "../../.github/workflows/ci-full.yml?raw";
import release from "../../.github/workflows/release.yml?raw";

/** Stratégie CI : rapide sur `développement`, complète seulement vers/sur `main`. */
describe("CI rapide (développement)", () => {
  it("ne tourne pas sur main (la CI complète s'en charge)", () => {
    expect(fast).toMatch(/branches-ignore:\s*\[main\]/);
  });

  it("annule les runs obsolètes", () => {
    expect(fast).toMatch(/concurrency:/);
    expect(fast).toMatch(/cancel-in-progress:\s*true/);
  });

  it("reste légère : pas de paquets système, pas de Tauri, pas d'e2e, pas de cargo", () => {
    expect(fast).not.toMatch(/apt-get/);
    expect(fast).not.toMatch(/tauri build/);
    expect(fast).not.toMatch(/playwright/);
    expect(fast).not.toMatch(/cargo/);
  });

  it("vérifie les types et ne teste que les fichiers modifiés", () => {
    expect(fast).toMatch(/tsc --noEmit/);
    expect(fast).toMatch(/vitest run --changed/);
  });

  it("met npm en cache", () => {
    expect(fast).toMatch(/cache:\s*npm/);
  });
});

describe("CI complète (main)", () => {
  it("tourne sur PR vers main et sur push main, avec concurrency", () => {
    expect(full).toMatch(/pull_request:\s*\n\s*branches:\s*\[main\]/);
    expect(full).toMatch(/push:\s*\n\s*branches:\s*\[main\]/);
    expect(full).toMatch(/cancel-in-progress:\s*true/);
  });

  it("lance la suite vitest complète, cargo et l'e2e réparti en shards", () => {
    expect(full).toMatch(/npm test/);
    expect(full).toMatch(/cargo test/);
    expect(full).toMatch(/--shard=\$\{\{ matrix\.shard \}\}\/3/);
  });

  it("e2e : Chrome préinstallé du runner, pas de téléchargement de navigateur", () => {
    expect(full).toMatch(/E2E_CHANNEL:\s*chrome/);
    expect(full).not.toMatch(/playwright install/);
  });

  it("garde les noms de jobs `test` et `e2e` (checks requis)", () => {
    expect(full).toMatch(/^ {2}test:/m);
    expect(full).toMatch(/^ {2}e2e:/m);
  });
});

describe("release", () => {
  it("n'est pas doublée par un autre run sur main", () => {
    expect(release).toMatch(/concurrency:/);
  });
});
