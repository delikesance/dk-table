/** App entry point: mounts the UI into #app and shows the onboarding screen (skip with `?onboarding=0`). */
import { mount } from "./ui/app";
import { initTheme } from "./ui/theme";
import { showOnboarding } from "./ui/onboarding/onboarding";

initTheme();

const root = document.getElementById("app") as HTMLElement;
const app = mount(root);
if (new URLSearchParams(location.search).get("onboarding") !== "0") showOnboarding(root, app);
