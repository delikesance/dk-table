/** Garde de fusion: un test deja rouge sur la base n'est toleree que s'il n'a aucun lien avec les fichiers modifies. */
import { describe, expect, it } from "vitest";
import { isRelated, relatedFailures, stem } from "./mergeGuard";

describe("stem", () => {
  it("nom de fichier sans extension ni suffixe .test/.spec", () => {
    expect([stem("src/ui/appDocs.test.ts"), stem("a/pipeline.parallel.test.ts"), stem("x/pipeline.ts"), stem("x/moodboard-view.js")])
      .toEqual(["appDocs", "pipeline.parallel", "pipeline", "moodboard-view"]);
  });
});
describe("isRelated", () => {
  it("le test lui-meme modifie, ou sa source (meme nom), ou un fichier dont le nom est son prefixe", () => {
    expect(isRelated("src/ui/appDocs.test.ts", ["src/ui/appDocs.test.ts"])).toBe(true);
    expect(isRelated("src/ui/appDocs.test.ts", ["src/ui/appDocs.ts"])).toBe(true);
    expect(isRelated("prototypes/oauth-sdk/pipeline.parallel.test.ts", ["prototypes/oauth-sdk/pipeline.ts"])).toBe(true);
    expect(isRelated("src/ui/appSplit.test.ts", ["src/ui/appDocs.ts", "TODO.md"])).toBe(false);
  });
});
describe("relatedFailures", () => {
  it("garde les echecs lies aux fichiers modifies (qui bloquent), ecarte les autres", () => {
    const fails = ["src/ui/appDocs.test.ts > docs > cree", "src/ui/appSplit.test.ts > barre > x"];
    expect(relatedFailures(fails, ["src/ui/appDocs.ts"])).toEqual(["src/ui/appDocs.test.ts > docs > cree"]);
    expect(relatedFailures(fails, ["docs/x.md"])).toEqual([]);
  });
});
