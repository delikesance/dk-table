/**
 * Toast: notification sobre, un seul visible à la fois, avec action optionnelle
 * (ex. « Annuler »). Style dans `toast.css`; tokens uniquement.
 */
import "./toast.css";

/** Options d'un toast. */
export interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Durée d'affichage en ms (défaut 5000). */
  duration?: number;
}

/** Poignée renvoyée par `showToast`. */
export interface ToastHandle {
  /** Ferme ce toast (sans effet s'il est déjà fermé ou remplacé). */
  dismiss(): void;
}

/** Fermeture du toast actuellement visible (le cas échéant). */
let closeCurrent: (() => void) | null = null;

/**
 * Affiche un toast dans `root` et remplace le précédent.
 * Fermeture: durée écoulée (setTimeout, donc fake timers), Échap, action, `dismiss()`.
 * L'action n'est appelée qu'une fois puis ferme le toast.
 */
export function showToast(opts: ToastOptions, root: HTMLElement = document.body): ToastHandle {
  closeCurrent?.();
  const el = document.createElement("div");
  el.className = "dk-toast";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  const msg = document.createElement("span");
  msg.className = "dk-toast__msg";
  msg.textContent = opts.message;
  el.appendChild(msg);

  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const close = (): void => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    document.removeEventListener("keydown", onKey);
    el.remove();
    if (closeCurrent === close) closeCurrent = null;
  };
  const onKey = (e: KeyboardEvent): void => { if (e.key === "Escape") close(); };

  if (opts.actionLabel) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dk-toast__action";
    btn.textContent = opts.actionLabel;
    btn.addEventListener("click", () => {
      if (closed) return;
      close();
      opts.onAction?.();
    });
    el.appendChild(btn);
  }

  document.addEventListener("keydown", onKey);
  timer = setTimeout(close, opts.duration ?? 5000);
  root.appendChild(el);
  closeCurrent = close;
  return { dismiss: close };
}
