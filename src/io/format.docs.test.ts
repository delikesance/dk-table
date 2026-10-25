import { describe, expect, it } from "vitest";
import { DktParseError, parse, serialize } from "./format";
import type { DktDoc } from "./types";

const base: DktDoc = {
  version: 1,
  sheets: [{ id: "s1", name: "Synthese", cols: 26, rows: 100, cells: { A1: { raw: "1" } } }],
  active: "s1",
};
const md = "Bonjour **toi**\n";
const content = { type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "text", text: "Bonjour" }] }] };
const withDocs: DktDoc = { ...base, docs: [{ id: "d1", name: "Rapport T1", md }] };

describe("documents texte du classeur", () => {
  it("fait l'aller-retour", () => {
    expect(parse(serialize(withDocs))).toEqual(withDocs);
  });
  it("charge un fichier sans documents", () => {
    expect(parse(serialize(base)).docs).toBeUndefined();
  });
  it("rejette une liste mal formée", () => {
    const bad = (d: unknown) => JSON.stringify({ ...base, docs: d });
    expect(() => parse(bad({}))).toThrow(/docs/);
    expect(() => parse(bad([{ id: "", name: "x", md }]))).toThrow(/docs\[0\].id/);
    expect(() => parse(bad([{ id: "d1", name: 3, md }]))).toThrow(/docs\[0\].name/);
    expect(() => parse(bad([{ id: "d1", name: "x", content: [] }]))).toThrow(/docs\[0\].md/);
    expect(() => parse(bad([{ id: "d1", name: "x", content: { type: "paragraph" } }]))).toThrow(/md/);
  });
  it("rejette un id déjà pris par une feuille ou un document", () => {
    const bad = (d: unknown) => JSON.stringify({ ...base, docs: d });
    expect(() => parse(bad([{ id: "s1", name: "x", md }]))).toThrow(/duplicate/);
    const d = { id: "d1", name: "x", md };
    expect(() => parse(bad([d, d]))).toThrow(/duplicate/);
  });
  it("ne garde que les champs connus d'un document", () => {
    const raw = JSON.stringify({ ...base, docs: [{ id: "d1", name: "x", md, extra: 1 }] });
    expect(parse(raw).docs?.[0]).toEqual({ id: "d1", name: "x", md });
  });
  it("convertit un ancien document ProseMirror (content) en Markdown", () => {
    const raw = JSON.stringify({ ...base, docs: [{ id: "d1", name: "x", content }] });
    expect(parse(raw).docs?.[0]).toEqual({ id: "d1", name: "x", md: "Bonjour\n" });
  });
});
