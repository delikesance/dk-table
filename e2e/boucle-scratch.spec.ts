import { test } from "@playwright/test";
import { startBoucle } from "./boucle/harness";

const ideas = [{ title: "Texte en colonnes", source: "Decoupe un texte." }, { title: "Tri multiple", source: "Trie." }];
test("S5", async () => {
  test.setTimeout(180000);
  let pushed = false;
  const b = await startBoucle({ ideas, script: { onRun: async (sector) => {
    if (sector !== "implementation" || pushed) return; pushed = true;
    const r = b.repo, dir = r.cwd + "-other";
    console.log((await r.git(["clone", r.origin, dir], r.cwd + "/..")).out);
    await r.git(["config", "user.email", "o@x"], dir); await r.git(["config", "user.name", "O"], dir);
    console.log((await r.git(["checkout", "developpement"], dir)).out);
    r.write("src/texte-en-colonnes.ts", "autre\n", dir); await r.git(["add", "-A"], dir);
    console.log((await r.git(["commit", "-m", "autre"], dir)).out, (await r.git(["push", "origin", "developpement"], dir)).out);
  } } });
  await b.go(5); await b.waitDone(120000);
  for (const e of b.events) if (e.type === "info" && /push|fusionn|conflit/.test(e.message ?? "")) console.log(e.message?.slice(0, 250));
  console.log((await b.repo.git(["log", "--oneline", "--graph", "developpement"])).out, (await b.repo.git(["status", "--short"])).out);
  await b.close();
});
