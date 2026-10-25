/**
 * Pages de la Boucle ouvertes dans un navigateur : panneau, moodboard et design (trois onglets d'un meme contexte).
 * Usage : `const p = await openPages(context, b.base)`; `p.panel`, `p.mood`, `p.design` sont des `Page`.
 */
import type { BrowserContext, Page } from "@playwright/test";

/** Les trois pages de la Boucle. */
export interface Pages { panel: Page; mood: Page; design: Page }

/** Ouvre le panneau, le moodboard et la page design sur `base`. */
export async function openPages(ctx: BrowserContext, base: string): Promise<Pages> {
  const [panel, mood, design] = await Promise.all([ctx.newPage(), ctx.newPage(), ctx.newPage()]);
  await Promise.all([panel.goto(base + "/"), mood.goto(base + "/moodboard.html"), design.goto(base + "/design.html")]);
  return { panel, mood, design };
}

/** Texte d'une colonne du moodboard (titres des cartes). */
export const column = (mood: Page, col: "idee" | "en-cours" | "preuves" | "termine"): Promise<string[]> =>
  mood.locator(`#col-${col} .card h3`).allInnerTexts();

/** Captures clair puis sombre d'une page dans docs/screenshots/boucle-e2e/ (seulement avec `BOUCLE_SHOTS=1`). */
export async function shoot(p: Page, name: string): Promise<void> {
  if (process.env.BOUCLE_SHOTS !== "1") return;
  for (const [scheme, suffix] of [["light", "clair"], ["dark", "sombre"]] as const) {
    await p.emulateMedia({ colorScheme: scheme });
    await p.waitForTimeout(150);
    await p.screenshot({ path: `docs/screenshots/boucle-e2e/${name}-${suffix}.png`, fullPage: true });
  }
  await p.emulateMedia({ colorScheme: null });
}
