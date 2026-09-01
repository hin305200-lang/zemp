import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "..");
const apiTarget = "http://127.0.0.1:4471";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

const STATIC_FILES = new Set([
  "/app.html",
  "/app.js",
  "/app.css",
  "/auth.js",
  "/auth.css",
  "/banks.js",
  "/gate.js",
  "/tracker.js",
  "/crm.js",
  "/crm.css",
  "/crm.html",
  "/styles.css",
  "/login.html",
  "/signup.html",
  "/account.html",
]);

function safeRepoFile(urlPath: string): string | null {
  const rel = urlPath.replace(/^\/+/, "");
  const resolved = path.resolve(repoRoot, rel);
  if (!resolved.startsWith(repoRoot + path.sep) && resolved !== repoRoot) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}

function sendFile(res: ServerResponse, filePath: string): void {
  const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  res.statusCode = 200;
  res.setHeader("Content-Type", type);
  fs.createReadStream(filePath).pipe(res);
}

/** Marketplace HTML/JS live in the repo root. Serve them even if python is down. */
function serveRepoStatic(): Plugin {
  return {
    name: "serve-repo-static",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
          next();
          return;
        }
        let urlPath = decodeURIComponent((req.url || "").split("?")[0] || "");
        if (urlPath === "/crm" || urlPath === "/crm/") urlPath = "/crm/index.html";
        if (STATIC_FILES.has(urlPath) || urlPath.startsWith("/crm/") || urlPath.startsWith("/assets/")) {
          const filePath = safeRepoFile(urlPath);
          if (filePath) {
            sendFile(res, filePath);
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE || (command === "build" ? "./" : "/"),
  plugins: [serveRepoStatic(), react()],
  publicDir: "public",
  build: {
    sourcemap: false,
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    fs: { allow: [root, repoRoot] },
    proxy: {
      "/api": apiTarget,
    },
  },
}));
