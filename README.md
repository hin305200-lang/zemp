# Zemp & Partner

Local demo site for **Zemp & Partner Asset Advisory AG** (Baar, Zug): public pages in English and a client marketplace after login.

This is a prototype. Products, partner banks, and Open-Banking links are simulated. Do not treat it as a live brokerage or production system.

## Run

**React app** (homepage, login, signup):

```bash
python3 server.py
```

In another terminal:

```bash
cd web
npm install
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/). Marketplace (`/app.html`) and CRM still come from Python / static HTML.

If the API is down (including GitHub Pages), the known demo and staff logins still work in the browser, and signup still creates a local session. Live tracking and real accounts need `python3 server.py`.

Do not use `python3 -m http.server` if you want live tracking — that still needs `server.py`.

Login emails and passwords are not stored in the source. Client checks use one-way hashes; the local database seals names and emails. Set `NNFIN_ADMIN_EMAIL` / `NNFIN_ADMIN_PASSWORD` (and the demo pair) in the environment if you want to override the built-in hashes.

SQLite is created at `data/nnfin.db` on first run. That file is gitignored.

## What’s in the repo

| Path | Role |
| --- | --- |
| `web/` | React app (home, login, signup) |
| `app.html` | Logged-in marketplace (not yet migrated) |
| `server.py` | HTTP + SQLite API |
| `assets/` | Avatars and animation libraries |

## GitHub

Do **not** drag the `nnfin` folder onto github.com. That folder contains `.git`, and GitHub’s upload page often goes white and never finishes.

**Option A — git (best)**

Create an empty repo on GitHub (no README), then:

```bash
cd /Users/thomas/Downloads/nnfin
git remote add origin https://github.com/YOUR_USER/nnfin.git
git push -u origin main
```

**Option B — website upload**

```bash
chmod +x scripts/pack-for-github.sh
./scripts/pack-for-github.sh
```

Then on GitHub: **Add file → Upload files**, and drop the folder `nnfin-github-upload` (next to `nnfin`, in Downloads).

If you turn on **GitHub Pages** (Settings → Pages → Deploy from branch `main`), the public site can show at `https://YOUR_USER.github.io/REPO/nnfin/`. Signup also works in the browser. Full tracking still needs `python3 server.py` locally.
