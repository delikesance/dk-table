/** Display-only number formatting (fr-FR); never alters raw or computed values. */

const fmts: Record<string, Intl.NumberFormat> = {
  number: new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  percent: new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 2 }),
  currency: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }),
};

/**
 * Format a displayed cell `text` according to format code `format`
 * ("general" | "number" | "percent" | "currency"). Non numeric text, empty
 * text, unknown or missing formats are returned unchanged.
 */
export function formatValue(text: string, format?: string): string {
  const f = format ? fmts[format] : undefined;
  if (!f || text.trim() === "") return text;
  const n = Number(text);
  return Number.isFinite(n) ? f.format(n) : text;
}
