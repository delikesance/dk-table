/**
 * Route /fonts/<nom>.woff2 : polices de la DA Hermes servies depuis `<assetsDir>/fonts` (liste blanche par nom).
 * Pourquoi : le panneau les demandait sans jamais les charger, d'ou un rendu en police systeme.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const FONT = /^GET \/fonts\/([a-z0-9-]+\.woff2)$/;

/** Renvoie le contenu de la police demandee (`null`: route non concernee ou fichier absent). */
export async function readFont(route: string, assetsDir: string): Promise<Buffer | null> {
  const m = FONT.exec(route);
  if (!m) return null;
  try { return await readFile(join(assetsDir, "fonts", m[1])); } catch { return null; }
}

/** Vrai si la route vise /fonts/ (pour repondre 404 plutot que de tomber dans une autre route). */
export const isFontRoute = (route: string): boolean => route.startsWith("GET /fonts/");
