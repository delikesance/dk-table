import { test } from "@playwright/test";
import { startBoucle } from "./boucle/harness";
import { makeRepo, researchDoc } from "./boucle/repo";

const ideas = [{ title: "Texte en colonnes", source: "Decoupe un texte." }, { title: "Tri multiple", source: "Trie." }];
const board = async (base: string) => ((await (await fetch(base + "/moodboard")).json()) as { id: string; state: string }[]).map((c) => `${c.id}:${c.state}`).join(" ");

test("S6 redemarrage", async ({ page }) => {
  test.setTimeout(240000);
  const repo = await makeRepo(ideas); const a = await startBoucle({ ideas, repo });
  await a.go(5); await a.waitDone();
  console.log("avant:", await board(a.base));
  await a.close();
  const b = await startBoucle({ ideas, repo });
  console.log("apres redemarrage:", await board(b.base));
  // la recherche est regeneree avec un titre un peu different + une idee en double dans 2 axes
  repo.write("docs/recherche/fonctionnalites.md", researchDoc([{ title: "Texte en colonnes (assistant)", source: "x" }, { title: "Tri multiple", source: "Trie." }]) + "\n## Absent de dk-table, present ailleurs\n\n- **Tri multiple** : doublon axe 2.\n");
  await b.repo.git(["add", "-A"]); await b.repo.git(["commit", "-m", "recherche"]); 
  await b.repo.git(["checkout", "developpement"]); await b.repo.git(["merge", "master"]);
  await new Promise((r) => setTimeout(r, 2500)); console.log("apres regeneration:", await board(b.base));
  await page.goto(b.base + "/moodboard.html"); await page.waitForTimeout(1500);
  console.log("MOOD:", (await page.locator("#board").innerText()).replace(/\n+/g, " ¦ "));
  await b.close(); repo.cleanup();
});
