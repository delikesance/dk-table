/**
 * Boucle e2e, page Design : le design du secteur apparait dans la toile en direct, apres fusion, et s'il n'est pas fusionne.
 * Vrai serveur + vrai git + faux agents (e2e/boucle/), navigateur reel.
 */
import { expect, test } from "@playwright/test";
import { startBoucle } from "./boucle/harness";
import { openPages } from "./boucle/pages";

const ideas = [{ title: "Texte en colonnes", source: "Decoupe." }];
const STAMP = /\d{4}-\d{2}-\d{2}-\d{6}\.html/;

test("le design s'affiche dans la toile des son ecriture, puis apres la fusion", async ({ context }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const b = await startBoucle({ ideas, script: { gate: (w) => (w === "design:written" ? gate : undefined) } });
  const { panel, design } = await openPages(context, b.base);
  await panel.click("#run");
  const frame = design.frameLocator("iframe");
  await expect(frame.locator("h1")).toContainText(STAMP, { timeout: 15_000 }); // worktree du secteur, pas encore fusionne
  await expect(design.locator("#thumbs .thumb")).toContainText(STAMP);
  release();
  await b.waitDone();
  await expect(design.locator("#timeline")).toContainText("Fusionné dans developpement", { timeout: 15_000 });
  await expect(frame.locator("h1")).toContainText(STAMP); // fusionne : le fichier est dans developpement, la toile le garde
  await expect(design.locator("#thumbs .thumb")).toHaveCount(1);
  await b.close();
});

test("la frise du designer note le fichier ecrit, meme si l'agent finit aussitot apres l'ecriture", async ({ context }) => {
  const b = await startBoucle({ ideas });
  const { panel, design } = await openPages(context, b.base);
  await panel.click("#run");
  await b.waitDone();
  await expect(design.locator("#timeline")).toContainText("Fichier écrit", { timeout: 15_000 });
  expect(b.events.some((e) => e.type === "file" && STAMP.test(e.message ?? ""))).toBe(true);
  await b.close();
});

test("design non fusionne (tests rouges) : la toile l'affiche quand meme et le journal dit pourquoi", async ({ context }) => {
  const b = await startBoucle({ ideas, checks: (cmd, dir) => (cmd === "npm test" && dir.includes("/design-") ? { code: 1, out: "FAIL x.test.ts > a\n" } : { code: 0, out: "" }) });
  const { panel, design } = await openPages(context, b.base);
  await panel.click("#run");
  await b.waitDone(90_000);
  await expect(design.locator("#timeline")).toContainText("Non fusionné", { timeout: 15_000 });
  await expect(design.frameLocator("iframe").locator("h1")).toContainText(STAMP);
  await b.close();
});
