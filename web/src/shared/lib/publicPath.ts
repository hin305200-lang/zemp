/** GitHub Pages serves this app under /fin/nnfin/; nnfinanz.com serves the same files at /. */
const GITHUB_PAGES_PREFIX = "/fin/nnfin";

/**
 * Absolute path to the SPA root. Vite `base: "./"` keeps asset URLs relative in
 * index.html so both hosts work; JS still needs a real prefix for app.html / CRM.
 */
export function spaRoot(): string {
  const viteBase = import.meta.env.BASE_URL;
  if (viteBase && viteBase !== "./" && viteBase !== ".") {
    return viteBase.endsWith("/") ? viteBase : `${viteBase}/`;
  }
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname;
  if (path === GITHUB_PAGES_PREFIX || path.startsWith(`${GITHUB_PAGES_PREFIX}/`)) {
    return `${GITHUB_PAGES_PREFIX}/`;
  }
  return "/";
}

export function publicPath(path: string): string {
  return `${spaRoot()}${path.replace(/^\//, "")}`;
}

export function routerBasename(): string | undefined {
  const root = spaRoot().replace(/\/$/, "");
  return root === "" ? undefined : root;
}
