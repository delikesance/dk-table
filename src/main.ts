/**
 * App entry point: mounts the UI into #app and shows the home screen, unless `?onboarding=0`
 * (e2e) or the "accueil au démarrage" setting is off.
 */
import { mount } from "./ui/app";
import { initTheme } from "./ui/theme";
import { showOnboarding } from "./ui/onboarding/onboarding";
import { homeOnStartup } from "./ui/dialogs/settings";
import { importCsv } from "./ui/fileops";
import { openImportReport } from "./ui/dialogs/importReport";
import { checkForUpdate } from "./ui/updater";

initTheme();

const root = document.getElementById("app") as HTMLElement;
const app = mount(root);
if (new URLSearchParams(location.search).get("onboarding") !== "0" && homeOnStartup()) {
  showOnboarding(root, {
    recents: () => app.recents(),
    onNew: () => app.select("A1"),
    onOpen: () => app.hooks.command?.("open"),
    onImportCsv: () => void importCsv(app),
    onOpenRecent: (p) => app.hooks.command?.(`recent:${p}`),
  });
}

// Contrôle silencieux des mises à jour quelques secondes après le démarrage (Tauri seulement).
setTimeout(() => void checkForUpdate(app, { silent: true }), 5000);

// Dev only (e2e, no Tauri dialog): `window.__dkImportCsv(nom, texte)` ouvre le rapport d'import CSV;
// `window.__dkOutline([niveaux])` pose le plan de la feuille active (pas encore de commande de groupement).
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__dkImportCsv = (name: string, text: string) => openImportReport(app, name, text);
  (window as unknown as Record<string, unknown>).__dkOutline = (levels: number[]) => app.setOutlineLevels(levels);
}
