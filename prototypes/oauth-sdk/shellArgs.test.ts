/** Arguments sous cmd.exe (shell: true) : sans guillemets, `git commit -m "Boucle: design"` perdait son message. */
import { describe, expect, it } from "vitest";
import { shellArgs } from "./shellArgs";

describe("shellArgs", () => {
  it("laisse les arguments tels quels hors Windows", () => {
    expect(shellArgs(["commit", "-m", "Boucle: design"], "linux")).toEqual(["commit", "-m", "Boucle: design"]);
  });
  it("sous Windows, entoure d'un seul argument ceux qui ont des espaces ou des caracteres speciaux", () => {
    expect(shellArgs(["commit", "-m", "Boucle: design", "-m", "Co-Authored-By: C <a@b>"], "win32"))
      .toEqual(["commit", "-m", '"Boucle: design"', "-m", '"Co-Authored-By: C <a@b>"']);
  });
  it("echappe les guillemets, double le % et laisse les arguments simples", () => {
    expect(shellArgs(["a", 'b "c"', "100%", "--format=%ct", "docs/design/"], "win32"))
      .toEqual(["a", '"b \\"c\\""', '"100%%"', '"--format=%%ct"', "docs/design/"]);
  });
  it("chaine vide = guillemets vides", () => {
    expect(shellArgs([""], "win32")).toEqual(['""']);
  });
});
