/** Tests de ui/protection.ts : mot de passe du classeur courant, en mémoire seulement. */
import { beforeEach, describe, expect, it } from "vitest";
import { getPassword, setPassword } from "./protection";

describe("protection", () => {
  beforeEach(() => setPassword(undefined));

  it("is unprotected by default", () => {
    expect(getPassword()).toBeUndefined();
  });

  it("keeps the password for the session and clears it", () => {
    setPassword("secret");
    expect(getPassword()).toBe("secret");
    setPassword(undefined);
    expect(getPassword()).toBeUndefined();
  });
});
