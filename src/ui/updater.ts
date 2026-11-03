/**
 * Mises à jour automatiques (Tauri uniquement): vérifie la dernière release GitHub (`latest.json`, signée),
 * propose « Installer » dans un toast, télécharge avec progression, puis propose « Redémarrer »
 * (jamais de redémarrage automatique : le document ouvert peut avoir des modifications non enregistrées).
 */
import { showToast } from "./toast/toast";
import type { App } from "./appTypes";

/** Sous-ensemble utilisé de `Update` (@tauri-apps/plugin-updater). */
interface UpdateLike {
  version: string;
  downloadAndInstall(onEvent?: (e: { event: string; data?: { contentLength?: number; chunkLength?: number } }) => void): Promise<void>;
}

/** True dans la fenêtre Tauri (ni navigateur, ni dev Vite, ni e2e). */
const inTauri = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Télécharge et installe `update`, puis propose de redémarrer. */
async function install(app: App, update: UpdateLike): Promise<void> {
  let total = 0, done = 0, shown = -1;
  try {
    await update.downloadAndInstall((e) => {
      if (e.event === "Started") total = e.data?.contentLength ?? 0;
      else if (e.event === "Progress") done += e.data?.chunkLength ?? 0;
      const pct = total ? Math.floor((done / total) * 100) : -1;
      if (e.event !== "Finished" && pct !== shown && (pct === -1 || pct % 10 === 0)) {
        shown = pct;
        showToast({ message: pct < 0 ? "Téléchargement de la mise à jour…" : `Téléchargement de la mise à jour… ${pct} %`, duration: 60000 });
      }
    });
  } catch {
    showToast({ message: "Échec de la mise à jour", duration: 6000 });
    return;
  }
  showToast({
    message: `Version ${update.version} installée${app.dirty ? " — enregistrez vos modifications avant de redémarrer" : ""}`,
    actionLabel: "Redémarrer", duration: 60000,
    onAction: () => void import("@tauri-apps/plugin-process").then((m) => m.relaunch()),
  });
}

/**
 * Cherche une mise à jour. `silent` (démarrage): aucun message sauf si une version existe, erreurs ignorées;
 * sinon (commande manuelle): « à jour » et erreurs sont annoncés.
 */
export async function checkForUpdate(app: App, opts: { silent: boolean }): Promise<void> {
  if (!inTauri()) return;
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) {
      if (!opts.silent) showToast({ message: "dk-table est à jour", duration: 4000 });
      return;
    }
    showToast({
      message: `Version ${update.version} disponible`, actionLabel: "Installer", duration: 15000,
      onAction: () => void install(app, update),
    });
  } catch {
    if (!opts.silent) showToast({ message: "Impossible de vérifier les mises à jour", duration: 5000 });
  }
}
