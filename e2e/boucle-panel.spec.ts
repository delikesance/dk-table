/**
 * Boucle e2e, panneau : l'etat affiche suit la realite (conflit reessaye, nouveau run, arret).
 * Vrai serveur + vrai git + faux agents (e2e/boucle/), navigateur reel.
 */
import { expect, test } from "@playwright/test";
import { startBoucle } from "./boucle/harness";
import { openPages, shoot } from "./boucle/pages";

const ideas = [{ title: "Texte en colonnes", source: "Decoupe." }, { title: "Tri multiple", source: "Trie." }, { title: "Zoom", source: "Zoom." }];
const phaseOf = (p: import("@playwright/test").Page, name: RegExp) => p.locator("#phasebar > li").filter({ hasText: name });

test("un conflit de fusion reessaye avec succes ne laisse ni phase ni agent en echec", async ({ context }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const b = await startBoucle({
    ideas, script: { gate: (w) => (w.startsWith("implementation") ? gate : undefined), card: (id) => ({ kind: "done", file: "src/shared.ts", text: `export const v = "${id}";\n` }) },
  });
  const { panel } = await openPages(context, b.base);
  await panel.click("#run");
  await expect(panel.locator("#phasebar li.agent.running")).toHaveCount(3);
  release();
  await b.waitDone();
  await expect(panel.locator("#status")).toContainText("Terminé, toutes les cartes");
  await expect(phaseOf(panel, /Implémentation/)).toHaveClass(/\bok\b/);
  await expect(panel.locator("#phasebar li.agent.fail")).toHaveCount(0);
  await expect(panel.locator("#now")).not.toContainText("ÉCHEC", { ignoreCase: true });
  await shoot(panel, "panneau-conflit-apres");
  await b.close();
});

test("un nouveau run repart de zero : couts et etats du run precedent ne s'additionnent pas", async ({ context }) => {
  const b = await startBoucle({ ideas: ideas.slice(0, 1), script: { cost: 0.108 } }); // 0,10 € par appel
  const { panel } = await openPages(context, b.base);
  await panel.click("#run");
  await b.waitDone();
  const design = phaseOf(panel, /Design/);
  await expect(design).toContainText("0,10 €");
  const done = b.events.length;
  await panel.click("#run");
  await expect.poll(() => b.events.length, { timeout: 15_000 }).toBeGreaterThan(done);
  await b.waitDone();
  await expect(design).toContainText("0,10 €"); // pas 0,20 €
  await expect(design).not.toContainText("0,20 €");
  await b.close();
});

test("Stop : retour immediat dans le panneau, puis « Arrêté » a la fin", async ({ context }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const b = await startBoucle({ ideas, script: { gate: (w) => (w.startsWith("implementation") ? gate : undefined) } });
  const { panel } = await openPages(context, b.base);
  await panel.click("#run");
  await expect(panel.locator("#phasebar li.agent.running")).toHaveCount(3);
  await panel.click("#run"); // Stop
  await expect(panel.locator("#status")).toContainText("Arrêt en cours");
  release();
  await b.waitDone();
  await expect(panel.locator("#status")).toContainText("Arrêté");
  await expect(panel.locator("#run")).toHaveText("Go");
  await b.close();
});

test("coupure du flux en plein run : le panneau reprend sans doubler journal ni couts", async ({ context }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const b = await startBoucle({ ideas: ideas.slice(0, 1), script: { cost: 0.108, gate: (w) => (w.startsWith("implementation:") ? gate : undefined) } });
  const { panel } = await openPages(context, b.base);
  await panel.click("#run");
  await expect(panel.locator("#phasebar li.agent.running")).toHaveCount(1);
  const design = phaseOf(panel, /Design/), lines = await panel.locator("#log li").count();
  await expect(design).toContainText("0,10 €");
  b.dropConnections();
  await expect(panel.locator("#conn")).toBeHidden({ timeout: 15_000 }); // reconnecte (EventSource, Last-Event-ID)
  await panel.waitForTimeout(500);
  await expect(design).toContainText("0,10 €"); // pas 0,20 €
  expect(await panel.locator("#log li").count()).toBe(lines);
  release();
  await b.waitDone();
  await expect(panel.locator("#status")).toContainText("Terminé, toutes les cartes");
  await b.close();
});
