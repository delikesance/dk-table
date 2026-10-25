/**
 * Decoupe d'une carte trop grosse : sous-cartes ajoutees dans docs/recherche/fonctionnalites.md.
 *
 * Quoi : `addSubcards(md, titre, parties)` insere, sous la puce `- **titre**`, une puce `- **partie**` par sous-carte
 *        (meme axe que le parent); sans effet si la puce du parent est introuvable ou si une partie existe deja.
 * Pourquoi : les cartes sont deduites de ce fichier; une carte L devient plusieurs cartes S/M traitables, la parente est ecartee.
 * Usage : `const next = addSubcards(md, "Audit de modele", ["Constantes en dur", "Formules incoherentes"])`.
 */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Nouveau contenu, ou `null` s'il n'y a rien a ajouter. */
export function addSubcards(md: string, parent: string, parts: string[]): string | null {
  const lines = md.split("\n");
  const at = lines.findIndex((l) => { const m = /^\s*[-*]\s+\*\*(.+?)\*\*/.exec(l); return !!m && norm(m[1]) === norm(parent); });
  if (at < 0) return null;
  const have = new Set(lines.map((l) => /^\s*[-*]\s+\*\*(.+?)\*\*/.exec(l)?.[1]).filter(Boolean).map((t) => norm(t as string)));
  const fresh = [...new Set(parts.map((p) => p.trim().replace(/\*\*/g, "")).filter((p) => p && !have.has(norm(p))))];
  if (!fresh.length) return null;
  lines.splice(at + 1, 0, ...fresh.map((p) => `- **${p}** : partie de « ${parent} » (decoupe automatique). Source (docs/recherche/fonctionnalites.md). Valeur : meme objectif que la carte parente, en plus petit.`));
  return lines.join("\n");
}
