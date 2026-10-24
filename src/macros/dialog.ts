/** Boîte de dialogue minimale « Exécuter une macro Lua » (zone de texte + Exécuter / Fermer). */
import type { App } from "../ui/appTypes";
import { runMacroOnApp } from "./run";

/** Ouvre la boîte; en cas d'erreur le message reste affiché et le script modifiable. */
export function openMacroDialog(app: App, doc: Document = document): void {
  const box = doc.createElement("div");
  box.className = "dk-macro";
  box.setAttribute("role", "dialog");
  box.style.cssText =
    "position:fixed;inset:10% 20%;z-index:1000;display:flex;flex-direction:column;gap:8px;padding:16px;" +
    "background:var(--c-surface,#fff);color:var(--c-text,#111);border:1px solid var(--c-border,#ccc);border-radius:12px";
  box.innerHTML =
    '<strong>Macro Lua</strong><textarea spellcheck="false" style="flex:1;font:13px monospace" ' +
    'placeholder=\'setCell("B1", getValue("A1") * 2)\'></textarea>' +
    '<div class="dk-macro__msg" style="color:#b00020"></div>' +
    '<div><button data-act="run">Exécuter</button> <button data-act="close">Fermer</button></div>';
  const area = box.querySelector("textarea")!;
  const msg = box.querySelector<HTMLElement>(".dk-macro__msg")!;
  box.addEventListener("click", async (e) => {
    const act = (e.target as HTMLElement).dataset.act;
    if (act === "close") box.remove();
    if (act !== "run") return;
    const r = await runMacroOnApp(app, area.value);
    if (r.ok) box.remove();
    else msg.textContent = r.error ?? "Erreur de macro.";
  });
  doc.body.append(box);
  area.focus();
}
