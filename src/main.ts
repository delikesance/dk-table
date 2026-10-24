/**
 * App entry point: mounts the UI into #app and shows the home screen, unless `?onboarding=0`
 * (e2e) or the "accueil au démarrage" setting is off.
 */
import { mount } from "./ui/app";
import { initTheme } from "./ui/theme";
import { showOnboarding } from "./ui/onboarding/onboarding";
import { homeOnStartup } from "./ui/dialogs/settings";
import { importCsv } from "./ui/fileops";

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
