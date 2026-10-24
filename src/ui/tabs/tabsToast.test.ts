// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createSheetTabs } from "./tabs";

/** Tabs without an injected confirm: deletion is confirmed through a toast. */
function setup() {
  document.body.innerHTML = "";
  const host = document.createElement("div");
  const onDelete = vi.fn();
  const t = createSheetTabs(host, { onAdd: vi.fn(), onRename: vi.fn(), onDelete, onSwitch: vi.fn() });
  t.setSheets([{ id: "a", name: "A" }, { id: "b", name: "B" }]);
  t.setActive("a");
  return { host, onDelete };
}
const del = (host: HTMLElement) =>
  host.querySelectorAll(".dk-tab:not(.dk-tab--add)")[1].dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));

describe("sheet delete confirmation toast", () => {
  it("asks via toast (no native confirm) and deletes only on 'Supprimer'", () => {
    const c = vi.spyOn(window, "confirm");
    const { host, onDelete } = setup();
    del(host);
    expect(c).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    const toast = document.querySelector(".dk-toast")!;
    expect(toast.textContent).toContain("Supprimer la feuille");
    toast.querySelector<HTMLButtonElement>(".dk-toast__action")!.click();
    expect(onDelete).toHaveBeenCalledWith("b");
    c.mockRestore();
  });
});
