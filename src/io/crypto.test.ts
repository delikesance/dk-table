/** Tests de io/crypto.ts : aller-retour, mauvais mot de passe, détection de l'enveloppe. */
import { describe, expect, it } from "vitest";
import { decryptText, encryptText, isEncryptedText, WrongPasswordError } from "./crypto";

const PLAIN = '{"version":1,"sheets":[]}';

describe("crypto", () => {
  it("encrypts so that the plain text is not readable", async () => {
    const enc = await encryptText(PLAIN, "secret");
    expect(enc).not.toContain("sheets");
    expect(isEncryptedText(enc)).toBe(true);
  });

  it("round-trips with the right password", async () => {
    const enc = await encryptText(PLAIN, "secret");
    expect(await decryptText(enc, "secret")).toBe(PLAIN);
  });

  it("rejects a wrong password with WrongPasswordError", async () => {
    const enc = await encryptText(PLAIN, "secret");
    await expect(decryptText(enc, "autre")).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it("uses a fresh salt and IV each time", async () => {
    const a = await encryptText(PLAIN, "secret");
    const b = await encryptText(PLAIN, "secret");
    expect(a).not.toBe(b);
  });

  it("does not detect plain documents as encrypted", () => {
    expect(isEncryptedText(PLAIN)).toBe(false);
    expect(isEncryptedText("pas du json")).toBe(false);
  });
});
