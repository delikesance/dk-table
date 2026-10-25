import { describe, expect, it } from "vitest";
import { Journal, summarize, type RunEntry } from "../journal";

const e = (o: Partial<RunEntry> = {}): RunEntry => ({
  ts: "t", cycle: 1, role: "audit", model: "haiku", inputTokens: 10, outputTokens: 5,
  cacheRead: 3, costUsd: 0.5, turns: 2, durationMs: 100, result: "ok", ...o,
});

describe("Journal", () => {
  it("ajoute une ligne JSON par entrée, secrets masqués", () => {
    const lines: string[] = [];
    const j = new Journal((l) => lines.push(l), { CLAUDE_CODE_OAUTH_TOKEN: "TOPSECRET123" });
    j.append(e({ result: "ok TOPSECRET123 sk-ant-abc" }));
    expect(lines).toHaveLength(1);
    expect(lines[0].endsWith("\n")).toBe(true);
    expect(lines[0]).not.toContain("TOPSECRET123");
    expect(lines[0]).not.toContain("sk-ant-abc");
    expect(JSON.parse(lines[0]).role).toBe("audit");
  });
  it("résume un cycle", () => {
    const s = summarize([e(), e({ role: "worker", costUsd: 1, result: "error" }), e({ cycle: 2 })], 1);
    expect(s).toEqual({ cycle: 1, calls: 2, costUsd: 1.5, tokens: 30, cacheRead: 6, errors: 1, durationMs: 200 });
  });
});
