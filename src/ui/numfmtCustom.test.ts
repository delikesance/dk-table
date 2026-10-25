import { describe, it, expect } from "vitest";
import { formatCustom, checkCustom } from "./numfmtCustom";
import { formatValue } from "./numfmt";

/** Espaces de milliers (fine insécable, espace) ramenées à une espace simple pour les comparaisons. */
const norm = (s: string | null) => (s ?? "<null>").replace(/[\s  ]/g, " ");

describe("formatCustom : une section", () => {
  it("texte entre guillemets ajouté, décimale à la française", () => {
    expect(formatCustom("12.5", '0.0" cm"')).toBe("12,5 cm");
  });
  it("zéros obligatoires", () => expect(formatCustom("3", "0.00")).toBe("3,00"));
  it("séparateur de milliers", () => {
    expect(norm(formatCustom("1234.5", "#,##0.00"))).toBe("1 234,50");
    expect(norm(formatCustom("1234567", "#,##0"))).toBe("1 234 567");
  });
  it("chiffres optionnels (#) disparaissent en fin", () => {
    expect(formatCustom("5", "#.##")).toBe("5");
    expect(formatCustom("0.5", "#.##")).toBe(",5");
  });
  it("pourcentage multiplie par 100", () => {
    expect(formatCustom("0.256", "0%")).toBe("26%");
    expect(formatCustom("0.5", "0.0%")).toBe("50,0%");
  });
  it("négatif : signe automatique avec une seule section", () => {
    expect(formatCustom("-2.5", "0.0")).toBe("-2,5");
  });
  it("littéraux non quotés (espace, €, $, -) et échappement \\", () => {
    expect(formatCustom("12", "0 €")).toBe("12 €");
    expect(formatCustom("12", "0 \\k\\g")).toBe("12 kg");
  });
});

describe("formatCustom : sections", () => {
  it("deux sections : négatif sans signe automatique", () => {
    expect(formatCustom("3", '0.00" €";-0.00" €"')).toBe("3,00 €");
    expect(formatCustom("-3", '0.00" €";-0.00" €"')).toBe("-3,00 €");
  });
  it("trois sections : zéro", () => {
    expect(formatCustom("0", '0;-0;"zéro"')).toBe("zéro");
    expect(formatCustom("-4", '0;-0;"zéro"')).toBe("-4");
  });
  it("quatre sections : texte avec @", () => {
    expect(formatCustom("abc", '0;-0;0;"<"@">"')).toBe("<abc>");
  });
  it("texte sans quatrième section : inchangé", () => {
    expect(formatCustom("abc", "0.00")).toBe("abc");
    expect(formatCustom("abc", '0;-0;0')).toBe("abc");
  });
});

describe("checkCustom", () => {
  it("accepte les codes valides", () => {
    expect(checkCustom('0.0" cm"')).toBeNull();
    expect(checkCustom('0;-0;"zéro";@')).toBeNull();
  });
  it("refuse le vide, cinq sections et les lettres non quotées", () => {
    expect(checkCustom("")).not.toBeNull();
    expect(checkCustom("0;0;0;0;0")).not.toBeNull();
    expect(checkCustom("0 kg")).not.toBeNull();
    expect(checkCustom("0 kg")).toContain("kg");
  });
});

describe("formatValue personnalisé", () => {
  it("préfixe custom: applique le code", () => {
    expect(formatValue("12.5", 'custom:0.0" cm"')).toBe("12,5 cm");
  });
  it("code invalide : texte inchangé", () => {
    expect(formatValue("12.5", "custom:0 kg")).toBe("12.5");
  });
  it("texte vide inchangé", () => {
    expect(formatValue("", 'custom:0.0" cm"')).toBe("");
  });
});
