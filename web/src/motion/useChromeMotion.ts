import { useLayoutEffect } from "react";

function listen(el: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions): () => void {
  el.addEventListener(type, fn, opts);
  return () => el.removeEventListener(type, fn, opts);
}

function killMouseDecorations(): void {
  document.querySelectorAll(".pointer-spot, .pointer-dot, .hit-ripple").forEach((node) => node.remove());
  document.documentElement.classList.remove("fine-pointer");
  document.documentElement.style.cursor = "";
  document.body.style.cursor = "";
}

export function setupChrome(): () => void {
  killMouseDecorations();
  const clean: Array<() => void> = [];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const nav = document.querySelector(".nav");
  const onScroll = (): void => {
    nav?.classList.toggle("is-compact", window.scrollY > 18);
  };
  onScroll();
  clean.push(listen(window, "scroll", onScroll, { passive: true }));

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    clean.push(
      listen(link, "click", (event) => {
        const href = link.getAttribute("href");
        if (!href || href === "#") return;
        const target = document.querySelector(href);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        document.dispatchEvent(new CustomEvent("nn-close-nav"));
      }),
    );
  });

  return () => {
    clean.forEach((fn) => fn());
    killMouseDecorations();
  };
}

export function useChromeMotion(): void {
  useLayoutEffect(() => setupChrome(), []);
}
