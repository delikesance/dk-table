/** Tests de io/protected.ts : document chiffré ou en clair, mot de passe requis ou erroné. */
import { describe, expect, it } from "vitest";
import { decodeDocument, encodeDocument, PasswordRequiredError } from "./protected";
import { WrongPasswordError } from "./crypto";
import type { DktDoc } from "./types";

const DOC: DktDoc = {
  version: 1,
  sheets: [{ id: "s1", name: "Feuille 1", cols: 26, rows: 100, cells: { A1: { raw: "42" }, B2: { raw: "=A1*2" } } }],
};

describe("protected documents", () => {
  it("writes plain JSON without a password", async () => {
    const text = await encodeDocument(DOC);
    expect(text).toContain('"Feuille 1"');
    expect(await decodeDocument(text)).toEqual(DOC);
  });

  it("hides the content when a password is given", async () => {
    const text = await encodeDocument(DOC, "secret");
    expect(text).not.toContain("Feuille 1");
    expect(text).not.toContain("=A1*2");
  });

  it("opens the same workbook with the right password", async () => {
    const text = await encodeDocument(DOC, "secret");
    expect(await decodeDocument(text, "secret")).toEqual(DOC);
  });

  it("asks for a password when the file is protected", async () => {
    const text = await encodeDocument(DOC, "secret");
    await expect(decodeDocument(text)).rejects.toBeInstanceOf(PasswordRequiredError);
  });

  it("reports a wrong password without returning a document", async () => {
    const text = await encodeDocument(DOC, "secret");
    await expect(decodeDocument(text, "faux")).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it("writes plain JSON again once the password is removed", async () => {
    const text = await encodeDocument(DOC);
    expect(JSON.parse(text).format).toBeUndefined();
  });
});
