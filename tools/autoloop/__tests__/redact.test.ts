import { describe, expect, it } from "vitest";
import { redact } from "../redact";

describe("redact", () => {
  it("masque les motifs sk-ant-", () => {
    expect(redact("a sk-ant-oat01-AbC_123-xyz b")).toBe("a [REDACTED] b");
  });
  it("masque la valeur du token d'env", () => {
    const out = redact("tok=SECRETVALUE12345 fin", { CLAUDE_CODE_OAUTH_TOKEN: "SECRETVALUE12345" });
    expect(out).toBe("tok=[REDACTED] fin");
  });
  it("ignore un token vide ou trop court", () => {
    expect(redact("abc", { CLAUDE_CODE_OAUTH_TOKEN: "" })).toBe("abc");
  });
});
