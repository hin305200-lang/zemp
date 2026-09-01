import { useLayoutEffect } from "react";
import { setupChrome } from "./useChromeMotion";

type Gsap = {
  registerPlugin: (...plugins: unknown[]) => void;
  context: (fn: () => void) => { revert: () => void };
  set: (targets: unknown, vars: object) => unknown;
  to: (targets: unknown, vars: object) => unknown;
  from: (targets: unknown, vars: object) => unknown;
  fromTo: (targets: unknown, fromVars: object, toVars: object) => unknown;
  timeline: (vars?: object) => { to: (targets: unknown, vars: object, position?: unknown) => unknown };
  utils: { toArray: <T>(targets: string) => T[] };
  quickTo?: (target: unknown, prop: string, vars: object) => (value: number) => void;
  matchMedia?: () => {
    add: (query: string, fn: () => void | (() => void)) => unknown;
    revert: () => void;
  };
};

type ScrollTriggerApi = {
  create: (vars: object) => unknown;
  refresh: () => void;
  getAll: () => Array<{ kill: () => void }>;
};

const PIPE_MARKET = [
  "M40 132 C90 128 120 118 170 122 S260 96 310 102 S400 78 450 86 S560 70 620 64",
  "M40 150 C90 140 120 110 170 116 S260 70 310 78 S400 46 450 60 S560 40 620 30",
  "M40 158 C90 148 130 120 180 128 S270 84 320 90 S410 54 470 62 S560 36 620 28",
  "M40 164 C100 150 140 118 190 124 S280 72 340 80 S430 40 500 48 S570 22 620 18",
];
const PIPE_GIRO = [
  "M40 168 C100 166 140 160 190 161 S280 154 330 156 S420 148 470 150 S570 144 620 142",
  "M40 168 C100 164 140 150 190 152 S280 128 330 134 S420 112 470 120 S570 104 620 96",
  "M40 170 C100 166 150 158 200 160 S290 148 350 150 S450 138 510 140 S580 132 620 128",
  "M40 172 C110 168 160 162 210 164 S300 154 360 156 S460 146 520 148 S580 140 620 136",
];
const PIPE_TIPS = [
  { when: "This week", market: "Marketplace 3.38%", giro: "Current 0.01 %" },
  { when: "Apr 2025", market: "Marketplace 3.41%", giro: "Current 0.01 %" },
  { when: "6 months", market: "Marketplace 3.29%", giro: "Current 0.01 %" },
  { when: "12 months", market: "Marketplace 3.22%", giro: "Current 0.02 %" },
];

function motionLibs(): { gsap: Gsap; ScrollTrigger: ScrollTriggerApi } | null {
  const w = window as unknown as { gsap?: Gsap; ScrollTrigger?: ScrollTriggerApi };
  const gsap = w.gsap;
  const ScrollTrigger = w.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return null;
  gsap.registerPlugin(ScrollTrigger);
  return { gsap, ScrollTrigger };
}

function listen(el: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions): () => void {
  el.addEventListener(type, fn, opts);
  return () => el.removeEventListener(type, fn, opts);
}

function wrapHeadingWords(heading: HTMLElement): void {
  if (heading.querySelector(".w")) return;
  const aria = (heading.textContent || "").replace(/\s+/g, " ").trim();
  if (aria) heading.setAttribute("aria-label", aria);
  const frag = document.createDocumentFragment();
  Array.from(heading.childNodes).forEach((node) => {
    if (node.nodeName === "BR") {
      frag.appendChild(document.createElement("br"));
      return;
    }
    const words = (node.textContent || "").trim().split(/\s+/).filter(Boolean);
    words.forEach((word, index) => {
      const span = document.createElement("span");
      span.className = "w";
      span.setAttribute("aria-hidden", "true");
      span.textContent = word;
      frag.appendChild(span);
      if (index < words.length - 1) frag.appendChild(document.createTextNode(" "));
    });
  });
  heading.replaceChildren(frag);
}

function showStatic(): void {
  document.documentElement.classList.remove("motion");
  document.querySelectorAll("[data-reveal],[data-hero],[data-hero-dash],[data-hero-line]").forEach((el) => {
    const node = el as HTMLElement;
    node.style.opacity = "1";
    node.style.transform = "none";
    node.style.filter = "none";
  });
}

function setupUi(gsap: Gsap | null): () => void {
  const clean: Array<() => void> = [];
  const switchEl = document.getElementById("billSwitch");
  const onBill = (): void => {
    if (!switchEl) return;
    const yearly = switchEl.classList.toggle("yearly");
    switchEl.setAttribute("aria-checked", yearly ? "true" : "false");
    document.querySelectorAll("[data-price]").forEach((el) => {
      const node = el as HTMLElement;
      node.textContent = yearly ? node.getAttribute("data-y") : node.getAttribute("data-m");
    });
    document.querySelectorAll("[data-billed]").forEach((el) => {
      el.textContent = yearly ? "for business clients" : "for private clients";
    });
  };
  switchEl?.addEventListener("click", onBill);
  clean.push(() => switchEl?.removeEventListener("click", onBill));

  document.querySelectorAll(".acc").forEach((acc) => {
    const head = acc.querySelector(".acc-head");
    const body = acc.querySelector(".acc-body") as HTMLElement | null;
    if (!head || !body) return;
    const setHeight = (): void => {
      body.style.maxHeight = acc.classList.contains("open") ? `${body.scrollHeight}px` : "0px";
    };
    const onClick = (): void => {
      const open = acc.classList.toggle("open");
      head.setAttribute("aria-expanded", open ? "true" : "false");
      setHeight();
    };
    head.addEventListener("click", onClick);
    setHeight();
    window.addEventListener("resize", setHeight);
    clean.push(() => {
      head.removeEventListener("click", onClick);
      window.removeEventListener("resize", setHeight);
    });
  });

  const ktTabs = document.querySelectorAll(".kt-tab");
  const ktPanels = document.querySelectorAll(".kt-panel");
  const ktSet = (index: number): void => {
    ktTabs.forEach((tab, j) => {
      tab.classList.toggle("on", index === j);
      tab.setAttribute("aria-selected", index === j ? "true" : "false");
    });
    ktPanels.forEach((panel, j) => {
      panel.classList.toggle("on", index === j);
    });
  };
  ktTabs.forEach((tab, i) => {
    const onClick = (): void => {
      ktSet(i);
      const panel = ktPanels[i] as HTMLElement | undefined;
      if (gsap && panel) {
        gsap.fromTo(panel, { opacity: 0.4, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" });
      }
    };
    tab.addEventListener("click", onClick);
    clean.push(() => tab.removeEventListener("click", onClick));
  });

  document.querySelectorAll(".dash").forEach((dash) => {
    const navs = dash.querySelectorAll(".dash-nav");
    navs.forEach((nav) => {
      const node = nav as HTMLElement;
      node.setAttribute("role", "button");
      node.tabIndex = 0;
      const activate = (): void => {
        navs.forEach((item) => item.classList.remove("active"));
        node.classList.add("active");
        const title = dash.querySelector(".dash-head h4");
        if (title) title.textContent = (node.textContent || "").replace(/\s+/g, " ").trim();
        const main = dash.querySelector(".dash-main");
        if (gsap && main) {
          gsap.fromTo(
            main.children,
            { opacity: 0.45, y: 12 },
            { opacity: 1, y: 0, duration: 0.38, stagger: 0.045, ease: "power2.out" },
          );
        }
      };
      clean.push(listen(node, "click", activate));
      clean.push(
        listen(node, "keydown", (event) => {
          if ((event as KeyboardEvent).key === "Enter" || (event as KeyboardEvent).key === " ") {
            event.preventDefault();
            activate();
          }
        }),
      );
    });
  });

  document.querySelectorAll(".pipe").forEach((pipe) => {
    const tabs = pipe.querySelectorAll(".pipe-tabs span");
    const chart = pipe.querySelector(".pipe-chart svg");
    const paths = chart?.querySelectorAll("path");
    const market = paths?.[1];
    const marketFill = paths?.[0];
    const giro = paths?.[3];
    const giroFill = paths?.[2];
    const tip = pipe.querySelector(".pipe-tip");
    tabs.forEach((tab, index) => {
      const node = tab as HTMLElement;
      node.setAttribute("role", "tab");
      node.tabIndex = 0;
      const activate = (): void => {
        tabs.forEach((item) => item.classList.remove("on"));
        node.classList.add("on");
        const m = PIPE_MARKET[index];
        const g = PIPE_GIRO[index];
        const copy = PIPE_TIPS[index];
        if (gsap && m && g) {
          if (market) gsap.to(market, { attr: { d: m }, duration: 0.7, ease: "power3.inOut" });
          if (marketFill) gsap.to(marketFill, { attr: { d: `${m} V180 H40 Z` }, duration: 0.7, ease: "power3.inOut" });
          if (giro) gsap.to(giro, { attr: { d: g }, duration: 0.7, ease: "power3.inOut" });
          if (giroFill) gsap.to(giroFill, { attr: { d: `${g} V180 H40 Z` }, duration: 0.7, ease: "power3.inOut" });
        }
        if (tip && copy) {
          const label = tip.querySelector("b");
          const marketLine = tip.querySelector(".r");
          const giroLine = tip.querySelector(".s");
          if (label) label.textContent = copy.when;
          if (marketLine) marketLine.textContent = copy.market;
          if (giroLine) giroLine.textContent = copy.giro;
          if (gsap) gsap.fromTo(tip, { y: 8, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" });
        }
      };
      clean.push(listen(node, "click", activate));
      clean.push(
        listen(node, "keydown", (event) => {
          if ((event as KeyboardEvent).key === "Enter" || (event as KeyboardEvent).key === " ") {
            event.preventDefault();
            activate();
          }
        }),
      );
    });
  });

  document.querySelectorAll(".bcard, .pcard, .dcard").forEach((card) => {
    clean.push(
      listen(card, "click", (event) => {
        if ((event.target as HTMLElement).closest("a,button,input,label")) return;
        card.classList.add("is-picked");
        window.setTimeout(() => card.classList.remove("is-picked"), 420);
      }),
    );
  });

  return () => {
    clean.forEach((fn) => fn());
  };
}

function playMotion(gsap: Gsap, ScrollTrigger: ScrollTriggerApi, ktSet: (index: number) => void): () => void {
  document.documentElement.classList.add("motion");
  const mm = typeof gsap.matchMedia === "function" ? gsap.matchMedia() : null;
  const ctx = gsap.context(() => {
    gsap.set("[data-hero]", { opacity: 0, y: 26 });
    gsap.set("[data-hero-line]", { yPercent: 112, filter: "blur(10px)" });
    gsap.set("[data-hero-dash]", { opacity: 0, y: 80 });
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to("[data-hero]", { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 }, 0.15);
    tl.to(
      "[data-hero-line]",
      { yPercent: 0, filter: "blur(0px)", duration: 1.05, stagger: 0.14, ease: "power4.out" },
      0.3,
    );
    tl.to("[data-hero-dash]", { opacity: 1, y: 0, duration: 1.15, ease: "power3.out" }, 0.75);

    gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
      if (el.matches(".bcard,.dcard,.pcard,.acc,.tstat,.tquote")) return;
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 86%", toggleActions: "play reverse play reverse" },
      });
    });

    document.querySelectorAll<HTMLElement>("h2.sec").forEach((heading) => {
      wrapHeadingWords(heading);
      const pinParent = heading.closest("#ktPin") as HTMLElement | null;
      gsap.fromTo(
        heading.querySelectorAll(".w"),
        { opacity: 0, y: 16, filter: "blur(8px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.045,
          scrollTrigger: {
            trigger: heading,
            start: "top 88%",
            toggleActions: "play reverse play reverse",
            pinnedContainer: pinParent || undefined,
          },
        },
      );
    });

    (
      [
        [".bento", ".bcard"],
        [".dgrid", ".dcard"],
        [".pcards", ".pcard"],
        [".faq", ".acc"],
      ] as const
    ).forEach(([gridSel, cardSel]) => {
      const grid = document.querySelector(gridSel);
      if (!grid) return;
      const cards = grid.querySelectorAll(cardSel);
      if (!cards.length) return;
      gsap.fromTo(
        cards,
        { opacity: 0, y: 34 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.09,
          scrollTrigger: { trigger: grid, start: "top 84%", toggleActions: "play reverse play reverse" },
        },
      );
    });

    gsap.utils.toArray<HTMLElement>(".tstat").forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, x: -48, y: 0 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play reverse play reverse" },
        },
      );
    });
    gsap.utils.toArray<HTMLElement>(".tquote").forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, x: 48, y: 0 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play reverse play reverse" },
        },
      );
    });

    document.querySelectorAll<HTMLElement>(".bar span").forEach((bar) => {
      const width = bar.style.width || "0%";
      gsap.fromTo(
        bar,
        { width: "0%" },
        {
          width,
          duration: 1.15,
          ease: "power3.out",
          scrollTrigger: { trigger: bar, start: "top 90%" },
        },
      );
    });

    gsap.to("[data-hero-dash]", {
      yPercent: -9,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 },
    });
    gsap.to(".hero-chart-bg", {
      yPercent: 18,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 },
    });

    const scDash = document.querySelector(".showcase .dash");
    if (scDash) {
      gsap.fromTo(
        scDash,
        { y: 56 },
        {
          y: -56,
          ease: "none",
          scrollTrigger: { trigger: ".showcase", start: "top bottom", end: "bottom top", scrub: 0.8 },
        },
      );
    }

    if (mm) {
      mm.add("(min-width: 1024px)", () => {
        const pin = ScrollTrigger.create({
          trigger: "#keytools",
          start: "top 15%",
          end: "+=1400",
          pin: "#ktPin",
          scrub: true,
          refreshPriority: 1,
          onUpdate: (self: { progress: number }) => {
            const i = Math.min(2, Math.floor(self.progress * 3));
            ktSet(i);
          },
        }) as { kill: () => void };
        return () => {
          pin.kill();
        };
      });
    }

    gsap.from(".dark", {
      yPercent: 6,
      borderRadius: "56px",
      ease: "none",
      scrollTrigger: { trigger: ".dark", start: "top 95%", end: "top 45%", scrub: true },
    });
  });

  const refresh = (): void => {
    ScrollTrigger.refresh();
  };
  requestAnimationFrame(refresh);
  window.addEventListener("load", refresh);
  window.addEventListener("resize", refresh);
  void document.fonts?.ready.then(refresh);

  return () => {
    window.removeEventListener("load", refresh);
    window.removeEventListener("resize", refresh);
    mm?.revert();
    ctx.revert();
    document.documentElement.classList.remove("motion");
  };
}

export function useHomeMotion(): void {
  useLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const libs = reduced ? null : motionLibs();
    const stopChrome = setupChrome();
    const stopUi = setupUi(libs?.gsap ?? null);
    const ktTabs = document.querySelectorAll(".kt-tab");
    const ktPanels = document.querySelectorAll(".kt-panel");
    const ktSet = (index: number): void => {
      ktTabs.forEach((tab, j) => {
        tab.classList.toggle("on", index === j);
        tab.setAttribute("aria-selected", index === j ? "true" : "false");
      });
      ktPanels.forEach((panel, j) => {
        panel.classList.toggle("on", index === j);
      });
    };

    if (reduced) {
      document.documentElement.classList.add("rm");
      showStatic();
      return () => {
        stopChrome();
        stopUi();
      };
    }

    if (!libs) {
      showStatic();
      return () => {
        stopChrome();
        stopUi();
      };
    }

    let stopMotion: () => void;
    try {
      stopMotion = playMotion(libs.gsap, libs.ScrollTrigger, ktSet);
    } catch {
      showStatic();
      return () => {
        stopChrome();
        stopUi();
      };
    }

    return () => {
      stopChrome();
      stopUi();
      stopMotion();
    };
  }, []);
}
