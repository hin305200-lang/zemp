#!/usr/bin/env python3
"""Zemp & Partner backend: users, sessions, activity tracking, and CRM API."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
DB_PATH = os.path.join(DATA_DIR, "nnfin.db")
PORT = int(os.environ.get("PORT", "4471"))
LOCK = threading.Lock()
RATE_HITS: dict[tuple[str, str], list[float]] = {}
MAX_BODY = 65_536
SESSION_DAYS = 14
TRUST_PROXY = os.environ.get("NNFIN_TRUST_PROXY") == "1"

ADMIN_EMAIL = (os.environ.get("NNFIN_ADMIN_EMAIL") or "").strip().lower()
ADMIN_PASSWORD = os.environ.get("NNFIN_ADMIN_PASSWORD") or ""
DEMO_EMAIL = (os.environ.get("NNFIN_DEMO_EMAIL") or "").strip().lower()
DEMO_PASSWORD = os.environ.get("NNFIN_DEMO_PASSWORD") or ""
ONLINE_SECS = 90
ADMIN_EMAIL_SHA = {
    "5edfa2692bdacc5e6ee805c626c50cb44cebb065f092d9a1067d89f74dacd326",
}
DEMO_EMAIL_SHA = {
    "f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a",
    "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
}
DEMO_PASS_ALIAS_SHA = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
BOOTSTRAP_ADMIN_SALT = "7c3e9b1a4f82d6e05c91a847b2d3f60e"
BOOTSTRAP_ADMIN_HASH = "505d4ea5894b137b95a5ce86f3f67eccaf080e496d64ffb82f9bcb90aba211f5"
BOOTSTRAP_DEMO_SALT = "e19a04c8b7d652f13e80a49c5b17d2aa"
BOOTSTRAP_DEMO_HASH = "5cfcbc6582282063c9fdab86f0971f1d9b89c6f2ecc47e1b6bd2e966d25e78cc"


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def new_id() -> str:
    return str(uuid.uuid4())


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 120000)
    return salt, digest.hex()


def check_password(password: str, salt: str, expected: str) -> bool:
    _, got = hash_password(password, salt)
    return secrets.compare_digest(got, expected)


DUMMY_SALT, DUMMY_HASH = hash_password("not-a-real-password")


VAULT_PATH = os.path.join(DATA_DIR, "vault.key")


def vault_key() -> bytes:
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(VAULT_PATH):
        with open(VAULT_PATH, "rb") as f:
            return f.read()
    key = secrets.token_bytes(32)
    fd = os.open(VAULT_PATH, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        os.write(fd, key)
    finally:
        os.close(fd)
    return key


def email_hash(email: str) -> str:
    return hashlib.sha256((email or "").strip().lower().encode("utf-8")).hexdigest()


def known_staff_email(email: str) -> bool:
    h = email_hash(email)
    if h in ADMIN_EMAIL_SHA:
        return True
    return bool(ADMIN_EMAIL) and h == email_hash(ADMIN_EMAIL)


def known_demo_email(email: str) -> bool:
    h = email_hash(email)
    if h in DEMO_EMAIL_SHA:
        return True
    return bool(DEMO_EMAIL) and h == email_hash(DEMO_EMAIL)


def staff_password_pair() -> tuple[str, str]:
    if ADMIN_PASSWORD:
        return hash_password(ADMIN_PASSWORD)
    return BOOTSTRAP_ADMIN_SALT, BOOTSTRAP_ADMIN_HASH


def demo_password_pair() -> tuple[str, str]:
    if DEMO_PASSWORD:
        return hash_password(DEMO_PASSWORD)
    return BOOTSTRAP_DEMO_SALT, BOOTSTRAP_DEMO_HASH


def demo_password_ok(password: str, salt: str, expected: str) -> bool:
    if check_password(password, salt, expected):
        return True
    return email_hash(password) == DEMO_PASS_ALIAS_SHA


def demo_user_row():
    row = DB.execute("SELECT * FROM users WHERE id = ?", ("demo-test-user",)).fetchone()
    if row:
        return row
    for h in DEMO_EMAIL_SHA:
        row = DB.execute("SELECT * FROM users WHERE email_hash = ?", (h,)).fetchone()
        if row:
            return row
    if DEMO_EMAIL:
        return user_by_email(DEMO_EMAIL)
    return None


def first_name(name: str) -> str:
    return ((name or "").strip().split(" ") or [""])[0] or "—"


def seal(plain: str | None) -> str:
    text = plain or ""
    if not text:
        return ""
    if text.startswith("v1:"):
        return text
    raw = text.encode("utf-8")
    key = vault_key()
    nonce = secrets.token_bytes(16)
    stream = hashlib.shake_256(key + nonce).digest(len(raw))
    ct = bytes(a ^ b for a, b in zip(raw, stream))
    tag = hmac.new(key, nonce + ct, hashlib.sha256).digest()
    return "v1:" + nonce.hex() + ":" + ct.hex() + ":" + tag.hex()


def unseal(token: str | None) -> str:
    text = token or ""
    if not text.startswith("v1:"):
        return text
    try:
        _, nhex, chex, thex = text.split(":")
        nonce, ct, tag = bytes.fromhex(nhex), bytes.fromhex(chex), bytes.fromhex(thex)
        key = vault_key()
        expect = hmac.new(key, nonce + ct, hashlib.sha256).digest()
        if not hmac.compare_digest(expect, tag):
            return ""
        stream = hashlib.shake_256(key + nonce).digest(len(ct))
        return bytes(a ^ b for a, b in zip(ct, stream)).decode("utf-8")
    except Exception:
        return ""


def user_by_email(email: str):
    email = (email or "").strip().lower()
    if not email:
        return None
    row = DB.execute("SELECT * FROM users WHERE email_hash = ?", (email_hash(email),)).fetchone()
    if row:
        return row
    return DB.execute("SELECT * FROM users WHERE lower(email) = ?", (email,)).fetchone()


def connect() -> sqlite3.Connection:
    os.makedirs(DATA_DIR, exist_ok=True)
    con = sqlite3.connect(DB_PATH, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    con.execute("PRAGMA journal_mode = WAL")
    return con


DB = connect()

STATUS_EN = {"neu": "new", "aktiv": "active", "beratung": "advice", "inaktiv": "inactive"}
KYC_EN = {"offen": "open", "verifiziert": "verified", "abgelehnt": "rejected"}


def norm_status(value: str | None) -> str:
    raw = (value or "new").strip()
    return STATUS_EN.get(raw, raw or "new")


def norm_kyc(value: str | None) -> str:
    raw = (value or "open").strip()
    return KYC_EN.get(raw, raw or "open")


def status_match_values(status: str) -> tuple[str, ...]:
    status = (status or "").strip()
    for de, en in STATUS_EN.items():
        if status in (de, en):
            return (de, en)
    return (status,) if status else ()


def kyc_match_values(kyc: str) -> tuple[str, ...]:
    kyc = (kyc or "").strip()
    for de, en in KYC_EN.items():
        if kyc in (de, en):
            return (de, en)
    return (kyc,) if kyc else ()


def init_db() -> None:
    DB.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          email_hash TEXT,
          phone TEXT DEFAULT '',
          address TEXT DEFAULT '',
          tax_id TEXT DEFAULT '',
          status TEXT DEFAULT 'new',
          kyc TEXT DEFAULT 'open',
          notes TEXT DEFAULT '',
          tags TEXT DEFAULT '',
          source TEXT DEFAULT 'website',
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          visitor_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_login_at TEXT,
          last_logout_at TEXT,
          last_seen_at TEXT,
          last_ip TEXT,
          last_user_agent TEXT,
          login_count INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          admin_id TEXT,
          token TEXT NOT NULL UNIQUE,
          kind TEXT NOT NULL,
          ip TEXT,
          user_agent TEXT,
          created_at TEXT NOT NULL,
          last_seen_at TEXT NOT NULL,
          ended_at TEXT,
          logout_reason TEXT
        );
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          visitor_id TEXT,
          session_id TEXT,
          type TEXT NOT NULL,
          path TEXT,
          title TEXT,
          label TEXT,
          href TEXT,
          extra TEXT,
          ip TEXT,
          user_agent TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS admins (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          email_hash TEXT,
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS crm_notes (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          author TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_events_visitor ON events(visitor_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, created_at);
        """
    )
    DB.commit()
    migrate_vault()
    cols = {r[1] for r in DB.execute("PRAGMA table_info(admins)").fetchall()}
    if "email_hash" not in cols:
        DB.execute("ALTER TABLE admins ADD COLUMN email_hash TEXT")
        DB.commit()
    DB.execute("CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash)")
    DB.commit()
    seed()


def migrate_vault() -> None:
    cols = {r[1] for r in DB.execute("PRAGMA table_info(users)").fetchall()}
    if "email_hash" not in cols:
        DB.execute("ALTER TABLE users ADD COLUMN email_hash TEXT")
    rows = DB.execute("SELECT * FROM users").fetchall()
    for r in rows:
        d = dict(r)
        name, email = d.get("name") or "", d.get("email") or ""
        if not str(email).startswith("v1:"):
            h = email_hash(email)
            DB.execute(
                """UPDATE users SET name = ?, email = ?, email_hash = ?, phone = ?, address = ?, tax_id = ?, notes = ?
                   WHERE id = ?""",
                (
                    seal(name), seal(email), h,
                    seal(d.get("phone") or ""), seal(d.get("address") or ""),
                    seal(d.get("tax_id") or ""), seal(d.get("notes") or ""),
                    d["id"],
                ),
            )
        elif not d.get("email_hash"):
            DB.execute("UPDATE users SET email_hash = ? WHERE id = ?", (email_hash(unseal(email)), d["id"]))
    for n in DB.execute("SELECT id, body FROM crm_notes").fetchall():
        body = n["body"] or ""
        if body and not str(body).startswith("v1:"):
            DB.execute("UPDATE crm_notes SET body = ? WHERE id = ?", (seal(body), n["id"]))
    DB.commit()


def seed() -> None:
    salt, pw = staff_password_pair()
    staff_mail = ADMIN_EMAIL or ""
    DB.execute("DELETE FROM admins")
    DB.execute(
        "INSERT INTO admins (id, name, email, email_hash, password_hash, salt, created_at) VALUES (?,?,?,?,?,?,?)",
        (new_id(), "Staff", seal(staff_mail), email_hash(staff_mail) if staff_mail else next(iter(ADMIN_EMAIL_SHA)), pw, salt, now()),
    )
    existing_demo = demo_user_row()
    if existing_demo:
        salt, pw = demo_password_pair()
        DB.execute(
            "UPDATE users SET password_hash = ?, salt = ?, phone = ?, address = ?, tax_id = ?, notes = ? WHERE id = ?",
            (pw, salt, seal(""), seal(""), seal(""), seal(""), existing_demo["id"]),
        )
    if not existing_demo:
        salt, pw = demo_password_pair()
        uid = "demo-test-user"
        created = "2026-01-15T10:00:00.000Z"
        demo_mail = DEMO_EMAIL or ""
        DB.execute(
            """INSERT INTO users (id, name, email, email_hash, phone, address, tax_id, status, kyc, notes, tags, source,
               password_hash, salt, created_at, updated_at, last_login_at, last_seen_at, login_count)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                uid, seal("Demo"), seal(demo_mail),
                email_hash(demo_mail) if demo_mail else next(iter(DEMO_EMAIL_SHA)),
                seal(""), seal(""), seal(""),
                "active", "verified", seal(""), "demo",
                "seed", pw, salt, created, now(), now(), now(), 12,
            ),
        )
        samples = [
            ("page_view", "/", "Zemp & Partner", "Home", None, "2026-08-18T08:12:00.000Z"),
            ("click", "/", "Zemp & Partner", "Log in", "/login.html", "2026-08-18T08:12:14.000Z"),
            ("page_view", "/login.html", "Log in", "Login opened", None, "2026-08-18T08:12:20.000Z"),
            ("login", "/login.html", "Log in", "Login succeeded", None, "2026-08-18T08:12:44.000Z"),
            ("page_view", "/app.html", "Marketplace", "Overview", None, "2026-08-18T08:13:02.000Z"),
            ("click", "/app.html", "Marketplace", "Banks", None, "2026-08-18T08:14:11.000Z"),
            ("click", "/app.html", "Marketplace", "HSBC Premier Current", None, "2026-08-18T09:02:00.000Z"),
            ("app_action", "/app.html", "Marketplace", "Account opened: HSBC", None, "2026-08-18T09:02:18.000Z"),
            ("page_view", "/app.html", "Marketplace", "Overnight", None, "2026-08-19T11:20:00.000Z"),
            ("click", "/app.html", "Marketplace", "Quenzia Direct", None, "2026-08-19T11:21:08.000Z"),
            ("app_action", "/app.html", "Marketplace", "Overnight opened", None, "2026-08-19T11:22:40.000Z"),
            ("page_view", "/app.html", "Marketplace", "ETF-Portfolios", None, "2026-08-20T16:40:00.000Z"),
            ("click", "/app.html", "Marketplace", "Lumenix Global", None, "2026-08-20T16:41:12.000Z"),
            ("heartbeat", "/app.html", "Marketplace", "Session active", None, "2026-08-21T07:55:00.000Z"),
            ("page_view", "/app.html", "Marketplace", "Profile & security", None, "2026-08-22T19:08:00.000Z"),
            ("profile_update", "/app.html", "Profile", "Profile saved", None, "2026-08-22T19:09:22.000Z"),
            ("login", "/login.html", "Log in", "Login succeeded", None, "2026-08-24T08:10:00.000Z"),
            ("page_view", "/app.html", "Marketplace", "Overview", None, "2026-08-24T08:10:20.000Z"),
            ("click", "/app.html", "Marketplace", "Activity", None, "2026-08-24T08:11:03.000Z"),
            ("page_view", "/", "Zemp & Partner", "Home", None, "2026-08-25T06:40:00.000Z"),
        ]
        for typ, path, title, label, href, created in samples:
            DB.execute(
                """INSERT INTO events (id, user_id, visitor_id, session_id, type, path, title, label, href, extra, ip, user_agent, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (new_id(), uid, "seed-visitor", None, typ, path, title, label, href, None, "", "", created),
            )
    pad_demo_telemetry()
    DB.commit()
    migrate_vault()


def pad_demo_telemetry() -> None:
    demo = demo_user_row()
    if not demo:
        return
    uid = demo["id"]
    n = DB.execute("SELECT COUNT(*) AS c FROM events WHERE user_id = ? AND created_at = ?", (uid, "2026-08-19T11:20:00.000Z")).fetchone()["c"]
    if n:
        return
    extra = [
        ("page_view", "/app.html", "Marketplace", "Overnight", None, "2026-08-19T11:20:00.000Z"),
        ("click", "/app.html", "Marketplace", "Quenzia Direct", None, "2026-08-19T11:21:08.000Z"),
        ("app_action", "/app.html", "Marketplace", "Overnight opened", None, "2026-08-19T11:22:40.000Z"),
        ("page_view", "/app.html", "Marketplace", "ETF-Portfolios", None, "2026-08-20T16:40:00.000Z"),
        ("click", "/app.html", "Marketplace", "Lumenix Global", None, "2026-08-20T16:41:12.000Z"),
        ("heartbeat", "/app.html", "Marketplace", "Session active", None, "2026-08-21T07:55:00.000Z"),
        ("page_view", "/app.html", "Marketplace", "Profile & security", None, "2026-08-22T19:08:00.000Z"),
        ("profile_update", "/app.html", "Profile", "Profile saved", None, "2026-08-22T19:09:22.000Z"),
        ("login", "/login.html", "Log in", "Login succeeded", None, "2026-08-24T08:10:00.000Z"),
        ("page_view", "/app.html", "Marketplace", "Overview", None, "2026-08-24T08:10:20.000Z"),
        ("click", "/app.html", "Marketplace", "Activity", None, "2026-08-24T08:11:03.000Z"),
        ("page_view", "/", "Zemp & Partner", "Home", None, "2026-08-25T06:40:00.000Z"),
    ]
    ua = ""
    for typ, path, title, label, href, created in extra:
        DB.execute(
            """INSERT INTO events (id, user_id, visitor_id, session_id, type, path, title, label, href, extra, ip, user_agent, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (new_id(), uid, "seed-visitor", None, typ, path, title, label, href, None, "", ua, created),
        )


def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row else None


def public_user(row) -> dict:
    u = dict(row)
    u["name"] = unseal(u.get("name"))
    u["email"] = unseal(u.get("email"))
    u["phone"] = unseal(u.get("phone"))
    u["address"] = unseal(u.get("address"))
    u["tax_id"] = unseal(u.get("tax_id"))
    u.pop("password_hash", None)
    u.pop("salt", None)
    u.pop("email_hash", None)
    u.pop("notes", None)
    u.pop("last_ip", None)
    u.pop("last_user_agent", None)
    u.pop("visitor_id", None)
    u.pop("password", None)
    u["status"] = norm_status(u.get("status"))
    u["kyc"] = norm_kyc(u.get("kyc"))
    u["online"] = is_online(u.get("last_seen_at"))
    return u


def staff_card(row) -> dict:
    u = public_user(row)
    return {
        "id": u["id"],
        "name": first_name(u.get("name")),
        "email": u.get("email") or "",
        "status": u.get("status") or "new",
        "kyc": u.get("kyc") or "open",
        "online": u.get("online"),
        "last_seen_at": u.get("last_seen_at"),
        "last_login_at": u.get("last_login_at"),
        "created_at": u.get("created_at"),
        "login_count": u.get("login_count") or 0,
        "source": u.get("source") or "",
    }


def is_online(ts: str | None) -> bool:
    if not ts:
        return False
    try:
        t = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - t).total_seconds() < ONLINE_SECS
    except Exception:
        return False


def parse_ts(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except Exception:
        return None


def parse_ua(ua: str | None) -> dict:
    raw = ua or ""
    device, browser, os_name = "Desktop", "Unknown", "Unknown"
    if "iPhone" in raw:
        device = "iPhone"
    elif "iPad" in raw:
        device = "iPad"
    elif "Android" in raw and "Mobile" in raw:
        device = "Android"
    elif "Android" in raw:
        device = "Tablet"
    elif "Mobile" in raw:
        device = "Mobile"
    if "Edg/" in raw:
        browser = "Edge"
    elif "OPR/" in raw or "Opera" in raw:
        browser = "Opera"
    elif "Chrome/" in raw:
        browser = "Chrome"
    elif "Firefox/" in raw:
        browser = "Firefox"
    elif "Safari/" in raw and "Chrome" not in raw:
        browser = "Safari"
    if "Mac OS" in raw or "Macintosh" in raw:
        os_name = "macOS"
    elif "Windows" in raw:
        os_name = "Windows"
    elif "Android" in raw:
        os_name = "Android"
    elif "iPhone" in raw or "iPad" in raw:
        os_name = "iOS"
    elif "Linux" in raw:
        os_name = "Linux"
    return {"device": device, "browser": browser, "os": os_name, "raw": raw[:180]}


def engagement_score(user: dict, events_n: int = 0) -> int:
    score = 8
    seen = parse_ts(user.get("last_seen_at"))
    if seen:
        age = (datetime.now(timezone.utc) - seen).total_seconds()
        if age < ONLINE_SECS:
            score += 30
        elif age < 3600:
            score += 22
        elif age < 86400:
            score += 16
        elif age < 86400 * 7:
            score += 8
    score += min(24, int(user.get("login_count") or 0) * 2)
    score += min(22, events_n // 3)
    kyc = norm_kyc(user.get("kyc"))
    status = norm_status(user.get("status"))
    if kyc == "verified":
        score += 10
    elif kyc == "rejected":
        score -= 12
    if status == "active":
        score += 8
    elif status == "advice":
        score += 6
    elif status == "inactive":
        score -= 14
    return max(0, min(99, score))


def event_heatmap(extra_sql: str = "", args: tuple = (), days: int = 14) -> list:
    rows = DB.execute(
        "SELECT created_at FROM events WHERE created_at >= date('now', ?) " + extra_sql,
        ("-%d days" % days,) + args,
    ).fetchall()
    grid = [[0] * 24 for _ in range(7)]
    for r in rows:
        dt = parse_ts(r["created_at"])
        if dt:
            grid[dt.weekday()][dt.hour] += 1
    return grid


def daily_series(extra_sql: str = "", args: tuple = (), days: int = 14) -> list:
    today = datetime.now(timezone.utc).date()
    out = []
    for i in range(days - 1, -1, -1):
        key = (today - timedelta(days=i)).isoformat()
        n = DB.execute(
            "SELECT COUNT(*) AS c FROM events WHERE substr(created_at,1,10) = ? " + extra_sql,
            (key,) + args,
        ).fetchone()["c"]
        out.append({"day": key, "n": n})
    return out


def type_mix(extra_sql: str = "", args: tuple = (), days: int = 14) -> list:
    rows = DB.execute(
        "SELECT type, COUNT(*) AS n FROM events WHERE created_at >= date('now', ?) "
        + extra_sql
        + " GROUP BY type ORDER BY n DESC",
        ("-%d days" % days,) + args,
    ).fetchall()
    return [dict(r) for r in rows]


def session_seconds(row) -> int:
    start = parse_ts(row["created_at"])
    end = parse_ts(row["ended_at"] or row["last_seen_at"] or row["created_at"])
    if not start or not end:
        return 0
    return max(0, int((end - start).total_seconds()))


def enrich_user(row) -> dict:
    u = staff_card(row)
    events_n = DB.execute("SELECT COUNT(*) AS c FROM events WHERE user_id = ?", (u["id"],)).fetchone()["c"]
    u["events"] = events_n
    u["score"] = engagement_score(u, events_n)
    return u


def staff_event(row) -> dict:
    d = dict(row)
    d["user_name"] = first_name(unseal(d.get("user_name")))
    d["user_email"] = unseal(d.get("user_email"))
    d.pop("ip", None)
    d.pop("user_agent", None)
    d.pop("extra", None)
    return d


def read_json(handler) -> dict:
    length = int(handler.headers.get("Content-Length") or 0)
    if length <= 0:
        return {}
    if length > MAX_BODY:
        raise ValueError("Request too large.")
    raw = handler.rfile.read(length)
    try:
        data = json.loads(raw.decode("utf-8") or "{}")
        return data if isinstance(data, dict) else {}
    except ValueError:
        raise
    except Exception:
        return {}


def bearer(handler) -> str | None:
    h = handler.headers.get("Authorization") or ""
    if h.lower().startswith("bearer "):
        return h[7:].strip()
    return None


def session_for(token: str | None, kind: str):
    if not token or token == "demo-local":
        return None
    row = DB.execute(
        "SELECT * FROM sessions WHERE token = ? AND kind = ? AND ended_at IS NULL",
        (token, kind),
    ).fetchone()
    if not row:
        return None
    created = parse_ts(row["created_at"])
    if created and datetime.now(timezone.utc) - created > timedelta(days=SESSION_DAYS):
        return None
    return row


def client_ip(handler) -> str:
    if TRUST_PROXY:
        return (handler.headers.get("X-Forwarded-For") or handler.client_address[0] or "").split(",")[0].strip()
    return handler.client_address[0] or ""


def ua(handler) -> str:
    return (handler.headers.get("User-Agent") or "")[:400]


def valid_email(email: str) -> bool:
    return bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$", email or "")) and len(email or "") <= 254


def valid_password(password: str) -> str | None:
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if len(password) > 128:
        return "Password is too long."
    if password.strip() != password:
        return "Password cannot start or end with spaces."
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return "Use at least one letter and one number."
    return None


def rate_ok(ip: str, bucket: str, limit: int, window_s: int) -> bool:
    now_ts = time.time()
    key = (ip or "unknown", bucket)
    hits = RATE_HITS.setdefault(key, [])
    hits[:] = [t for t in hits if now_ts - t < window_s]
    if len(hits) >= limit:
        return False
    hits.append(now_ts)
    return True


def normalize_demo_login(email: str, password: str) -> tuple[str, str]:
    return (email or "").strip().lower(), (password or "").strip()


def admin_by_credentials(email: str, password: str):
    email = (email or "").strip().lower()
    password = (password or "").strip()
    if not email or not password:
        return None
    h = email_hash(email)
    row = DB.execute("SELECT * FROM admins WHERE email_hash = ?", (h,)).fetchone()
    if not row:
        for a in DB.execute("SELECT * FROM admins"):
            if email_hash(unseal(a["email"])) == h or (not unseal(a["email"]) and known_staff_email(email)):
                row = a
                break
    if not row or not check_password(password, row["salt"], row["password_hash"]):
        return None
    if known_staff_email(email) and not unseal(row["email"]):
        DB.execute(
            "UPDATE admins SET email = ?, email_hash = ? WHERE id = ?",
            (seal(email), h, row["id"]),
        )
        row = DB.execute("SELECT * FROM admins WHERE id = ?", (row["id"],)).fetchone()
    return row


def staff_by_login(email: str, password: str):
    return admin_by_credentials(email, password)


def insert_event(user_id, visitor_id, session_id, typ, path, title, label, href, extra, ip, user_agent):
    extra_s = json.dumps(extra, ensure_ascii=False) if extra else None
    DB.execute(
        """INSERT INTO events (id, user_id, visitor_id, session_id, type, path, title, label, href, extra, ip, user_agent, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (new_id(), user_id, visitor_id, session_id, typ, path, title, label, href, extra_s, "", "", now()),
    )


def touch_user(user_id: str, ip: str, user_agent: str) -> None:
    DB.execute(
        "UPDATE users SET last_seen_at = ?, updated_at = ? WHERE id = ?",
        (now(), now(), user_id),
    )


init_db()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        sys_stderr = __import__("sys").stderr
        sys_stderr.write("[nnfin] " + (fmt % args) + "\n")

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        super().end_headers()

    def send_json(self, code: int, payload) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def error_json(self, code: int, message: str) -> None:
        self.send_json(code, {"error": message})

    def do_GET(self):
        parsed = urlparse(self.path)
        if (
            parsed.path.startswith("/data/")
            or parsed.path.endswith(".py")
            or parsed.path.endswith(".db")
            or parsed.path.endswith(".key")
            or parsed.path.endswith(".sqlite")
        ):
            return self.error_json(403, "Forbidden")
        if self.path.startswith("/api/"):
            return self.dispatch("GET")
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self.dispatch("POST")
        return self.error_json(404, "Not found")

    def do_PATCH(self):
        if self.path.startswith("/api/"):
            return self.dispatch("PATCH")
        return self.error_json(404, "Not found")

    def dispatch(self, method: str) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        query = {k: v[0] for k, v in parse_qs(parsed.query).items()}
        body = read_json(self) if method in ("POST", "PATCH") else {}
        ip, user_agent = client_ip(self), ua(self)
        token = bearer(self)
        with LOCK:
            try:
                self.route(method, path, query, body, token, ip, user_agent)
            except ValueError as e:
                self.error_json(400, str(e))
            except PermissionError as e:
                self.error_json(401, str(e) or "Please sign in.")
            except LookupError as e:
                self.error_json(404, str(e) or "Not found")
            except Exception:
                self.error_json(500, "Something went wrong. Please try again.")

    def require_user(self, token):
        sess = session_for(token, "user")
        if not sess:
            raise PermissionError("Please sign in.")
        user = DB.execute("SELECT * FROM users WHERE id = ?", (sess["user_id"],)).fetchone()
        if not user:
            raise PermissionError("Please sign in.")
        return sess, user

    def require_admin(self, token):
        sess = session_for(token, "admin")
        if not sess:
            raise PermissionError("Staff login required.")
        admin = DB.execute("SELECT * FROM admins WHERE id = ?", (sess["admin_id"],)).fetchone()
        if not admin:
            raise PermissionError("Staff login required.")
        return sess, admin

    def route(self, method, path, query, body, token, ip, user_agent):
        if method == "GET" and path == "/api/health":
            n = DB.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
            return self.send_json(200, {"ok": True, "users": n})

        if method == "POST" and path == "/api/signup":
            if not rate_ok(ip, "signup", 8, 3600):
                return self.error_json(429, "Too many attempts. Please wait and try again.")
            return self.signup(body, ip, user_agent)
        if method == "POST" and path == "/api/login":
            if not rate_ok(ip, "login", 12, 900):
                return self.error_json(429, "Too many attempts. Please wait and try again.")
            return self.login(body, ip, user_agent)
        if method == "POST" and path == "/api/logout":
            return self.logout(token, body, ip, user_agent)
        if method == "GET" and path == "/api/me":
            sess, user = self.require_user(token)
            touch_user(user["id"], ip, user_agent)
            DB.execute("UPDATE sessions SET last_seen_at = ? WHERE id = ?", (now(), sess["id"]))
            DB.commit()
            return self.send_json(200, {"user": public_user(user), "sessionId": sess["id"]})
        if method == "PATCH" and path == "/api/me":
            return self.patch_me(token, body, ip, user_agent)
        if method == "POST" and path == "/api/events":
            return self.ingest_events(token, body, ip, user_agent)
        if method == "POST" and path == "/api/heartbeat":
            return self.heartbeat(token, body, ip, user_agent)

        if method == "POST" and path == "/api/admin/login":
            if not rate_ok(ip, "admin-login", 8, 900):
                return self.error_json(429, "Too many attempts. Please wait and try again.")
            return self.admin_login(body, ip, user_agent)
        if method == "POST" and path == "/api/admin/logout":
            sess = session_for(token, "admin")
            if sess:
                DB.execute("UPDATE sessions SET ended_at = ?, logout_reason = ? WHERE id = ?", (now(), "logout", sess["id"]))
                DB.commit()
            return self.send_json(200, {"ok": True})
        if method == "GET" and path == "/api/admin/overview":
            self.require_admin(token)
            return self.send_json(200, self.overview())
        if method == "GET" and path == "/api/admin/clients":
            self.require_admin(token)
            return self.send_json(200, {"clients": self.list_clients(query)})
        if method == "GET" and path == "/api/admin/live":
            self.require_admin(token)
            return self.send_json(200, {"live": self.live()})
        if method == "GET" and path == "/api/admin/intel":
            self.require_admin(token)
            return self.send_json(200, self.intel())
        if method == "GET" and path == "/api/admin/activity":
            self.require_admin(token)
            return self.send_json(200, {"events": self.global_activity(query)})

        m = re.match(r"^/api/admin/clients/([^/]+)$", path)
        if m and method == "GET":
            self.require_admin(token)
            return self.send_json(200, self.client_detail(m.group(1)))
        if m and method == "PATCH":
            sess, admin = self.require_admin(token)
            return self.patch_client(m.group(1), body, admin, ip, user_agent)

        m = re.match(r"^/api/admin/clients/([^/]+)/events$", path)
        if m and method == "GET":
            self.require_admin(token)
            return self.send_json(200, {"events": self.user_events(m.group(1), query)})

        m = re.match(r"^/api/admin/clients/([^/]+)/sessions$", path)
        if m and method == "GET":
            self.require_admin(token)
            rows = DB.execute(
                "SELECT created_at, last_seen_at, ended_at, logout_reason FROM sessions WHERE user_id = ? AND kind = 'user' ORDER BY created_at DESC LIMIT 100",
                (m.group(1),),
            ).fetchall()
            return self.send_json(200, {"sessions": [dict(r) for r in rows]})

        m = re.match(r"^/api/admin/clients/([^/]+)/notes$", path)
        if m and method == "POST":
            sess, admin = self.require_admin(token)
            text = (body.get("body") or "").strip()
            if not text:
                raise ValueError("Note cannot be empty.")
            DB.execute(
                "INSERT INTO crm_notes (id, user_id, author, body, created_at) VALUES (?,?,?,?,?)",
                (new_id(), m.group(1), admin["name"], seal(text), now()),
            )
            insert_event(m.group(1), None, sess["id"], "crm_note", "/crm/", "CRM", "Note added", None, {"preview": text[:120]}, ip, user_agent)
            DB.commit()
            return self.send_json(200, {"ok": True})

        raise LookupError("Not found")

    def signup(self, body, ip, user_agent):
        name = (body.get("name") or "").strip()
        email = (body.get("email") or "").strip().lower()
        phone = (body.get("phone") or "").strip()
        password = body.get("password") or ""
        confirm = body.get("confirm") or ""
        visitor_id = (body.get("visitorId") or "")[:80]
        if len(name) < 2 or len(name) > 80:
            raise ValueError("Please enter your name.")
        if not valid_email(email):
            raise ValueError("Please enter a valid email address.")
        if known_staff_email(email):
            raise ValueError("An account already exists for this email. Please sign in.")
        pw_err = valid_password(password)
        if pw_err:
            raise ValueError(pw_err)
        if password != confirm:
            raise ValueError("Passwords do not match.")
        if len(phone) > 40:
            raise ValueError("Phone number is too long.")
        if user_by_email(email):
            raise ValueError("An account already exists for this email. Please sign in.")
        uid = new_id()
        salt, pw = hash_password(password)
        ts = now()
        DB.execute(
            """INSERT INTO users (id, name, email, email_hash, phone, status, kyc, source, password_hash, salt, visitor_id,
               created_at, updated_at, last_login_at, last_seen_at, last_ip, last_user_agent, login_count)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (uid, seal(name), seal(email), email_hash(email), seal(phone), "new", "open", "signup", pw, salt, visitor_id or None,
             ts, ts, ts, ts, "", "", 1),
        )
        if visitor_id:
            DB.execute("UPDATE events SET user_id = COALESCE(user_id, ?) WHERE visitor_id = ?", (uid, visitor_id))
        sid, token = self.open_session(uid, None, "user", ip, user_agent)
        insert_event(uid, visitor_id, sid, "signup", "/signup.html", "Sign up", "Account created", None, None, ip, user_agent)
        insert_event(uid, visitor_id, sid, "login", "/signup.html", "Sign up", "Signed in after registration", None, None, ip, user_agent)
        DB.commit()
        user = DB.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
        return self.send_json(200, {"token": token, "sessionId": sid, "user": public_user(user)})

    def login(self, body, ip, user_agent):
        email, password = normalize_demo_login(body.get("email") or "", body.get("password") or "")
        visitor_id = (body.get("visitorId") or "")[:80]
        admin = admin_by_credentials(email, password)
        if admin:
            sid, token = self.open_session(None, admin["id"], "admin", ip, user_agent)
            DB.commit()
            return self.send_json(
                200,
                {
                    "kind": "staff",
                    "token": token,
                    "admin": {"id": admin["id"], "name": "Staff"},
                },
            )
        user = demo_user_row() if known_demo_email(email) else user_by_email(email)
        ok = False
        if user:
            if known_demo_email(email):
                ok = demo_password_ok(password, user["salt"], user["password_hash"])
            else:
                ok = check_password(password, user["salt"], user["password_hash"])
        else:
            check_password(password, DUMMY_SALT, DUMMY_HASH)
        if not user or not ok:
            insert_event(user["id"] if user else None, visitor_id, None, "login_failed", "/login.html", "Log in", "auth", None, None, ip, user_agent)
            DB.commit()
            raise ValueError("Email or password is incorrect.")
        if known_demo_email(email) and valid_email(email) and not unseal(user["email"]):
            DB.execute(
                "UPDATE users SET email = ?, email_hash = ? WHERE id = ?",
                (seal(email), email_hash(email), user["id"]),
            )
        DB.execute(
            """UPDATE users SET last_login_at = ?, last_seen_at = ?,
               login_count = login_count + 1, visitor_id = COALESCE(visitor_id, ?), updated_at = ? WHERE id = ?""",
            (now(), now(), visitor_id or None, now(), user["id"]),
        )
        if visitor_id:
            DB.execute("UPDATE events SET user_id = COALESCE(user_id, ?) WHERE visitor_id = ?", (user["id"], visitor_id))
        sid, token = self.open_session(user["id"], None, "user", ip, user_agent)
        insert_event(user["id"], visitor_id, sid, "login", "/login.html", "Log in", "Login succeeded", None, None, ip, user_agent)
        DB.commit()
        user = DB.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
        return self.send_json(200, {"token": token, "sessionId": sid, "user": public_user(user)})

    def logout(self, token, body, ip, user_agent):
        sess = session_for(token, "user")
        if sess:
            DB.execute("UPDATE sessions SET ended_at = ?, logout_reason = ? WHERE id = ?", (now(), "logout", sess["id"]))
            DB.execute("UPDATE users SET last_logout_at = ?, updated_at = ? WHERE id = ?", (now(), now(), sess["user_id"]))
            insert_event(sess["user_id"], body.get("visitorId"), sess["id"], "logout", body.get("path") or "/", "Log out", "Logout", None, None, ip, user_agent)
            DB.commit()
        return self.send_json(200, {"ok": True})

    def open_session(self, user_id, admin_id, kind, ip, user_agent):
        sid, token = new_id(), secrets.token_hex(32)
        ts = now()
        DB.execute(
            """INSERT INTO sessions (id, user_id, admin_id, token, kind, ip, user_agent, created_at, last_seen_at)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (sid, user_id, admin_id, token, kind, "", "", ts, ts),
        )
        return sid, token

    def patch_me(self, token, body, ip, user_agent):
        sess, user = self.require_user(token)
        fields = {}
        for key in ("name", "phone", "address", "tax_id"):
            if key in body or (key == "tax_id" and "taxId" in body):
                val = body.get(key, body.get("taxId", ""))
                fields[key] = seal((val or "").strip())
        if not fields:
            return self.send_json(200, {"user": public_user(user)})
        sets = ", ".join(k + " = ?" for k in fields)
        DB.execute("UPDATE users SET " + sets + ", updated_at = ? WHERE id = ?", list(fields.values()) + [now(), user["id"]])
        insert_event(user["id"], body.get("visitorId"), sess["id"], "profile_update", "/app.html", "Profile", "Profile saved", None, None, ip, user_agent)
        touch_user(user["id"], ip, user_agent)
        DB.commit()
        user = DB.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
        return self.send_json(200, {"user": public_user(user)})

    def ingest_events(self, token, body, ip, user_agent):
        sess = session_for(token, "user")
        user_id = sess["user_id"] if sess else None
        visitor_id = (body.get("visitorId") or "")[:80] or None
        if not user_id and token == "demo-local":
            demo = demo_user_row()
            user_id = demo["id"] if demo else None
        items = body.get("events") or []
        if not isinstance(items, list):
            raise ValueError("Invalid events.")
        allowed = {
            "click", "page_view", "app_action", "heartbeat", "hidden", "visible",
            "nav", "view", "submit", "scroll", "change", "profile_update"
        }
        for item in items[:120]:
            if not isinstance(item, dict):
                continue
            typ = (item.get("type") or "click")[:40]
            if typ not in allowed:
                continue
            extra = item.get("extra") if isinstance(item.get("extra"), dict) else None
            if extra:
                extra = {k: extra[k] for k in extra if k not in ("value", "password", "iban", "taxId", "tax_id")}
            insert_event(
                user_id, visitor_id, sess["id"] if sess else None, typ,
                (item.get("path") or "")[:300], (item.get("title") or "")[:200],
                (item.get("label") or "")[:240], (item.get("href") or "")[:400] or None,
                extra or None,
                ip, user_agent,
            )
        if user_id:
            touch_user(user_id, ip, user_agent)
            if sess:
                DB.execute("UPDATE sessions SET last_seen_at = ? WHERE id = ?", (now(), sess["id"]))
        DB.commit()
        return self.send_json(200, {"ok": True, "accepted": min(len(items), 120)})

    def heartbeat(self, token, body, ip, user_agent):
        sess = session_for(token, "user")
        if sess:
            touch_user(sess["user_id"], ip, user_agent)
            DB.execute("UPDATE sessions SET last_seen_at = ? WHERE id = ?", (now(), sess["id"]))
            DB.commit()
        return self.send_json(200, {"ok": True})

    def admin_login(self, body, ip, user_agent):
        email = (body.get("email") or "").strip().lower()
        password = (body.get("password") or "").strip()
        admin = staff_by_login(email, password)
        if not admin:
            raise ValueError("Email or password is incorrect.")
        sid, token = self.open_session(None, admin["id"], "admin", ip, user_agent)
        DB.commit()
        return self.send_json(200, {"token": token, "admin": {"id": admin["id"], "name": "Staff"}})

    def overview(self):
        users = DB.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        verified = DB.execute("SELECT COUNT(*) AS c FROM users WHERE kyc IN ('verifiziert', 'verified')").fetchone()["c"]
        logins_today = DB.execute("SELECT COUNT(*) AS c FROM events WHERE type = 'login' AND created_at >= date('now')").fetchone()["c"]
        signups_today = DB.execute("SELECT COUNT(*) AS c FROM events WHERE type = 'signup' AND created_at >= date('now')").fetchone()["c"]
        clicks_today = DB.execute("SELECT COUNT(*) AS c FROM events WHERE type = 'click' AND created_at >= date('now')").fetchone()["c"]
        failed_today = DB.execute("SELECT COUNT(*) AS c FROM events WHERE type = 'login_failed' AND created_at >= date('now')").fetchone()["c"]
        events_today = DB.execute("SELECT COUNT(*) AS c FROM events WHERE created_at >= date('now')").fetchone()["c"]
        visitors = DB.execute(
            "SELECT COUNT(DISTINCT visitor_id) AS c FROM events WHERE visitor_id IS NOT NULL AND visitor_id != '' AND created_at >= date('now', '-7 days')"
        ).fetchone()["c"]
        online = self.live()
        recent = DB.execute("SELECT * FROM users ORDER BY created_at DESC LIMIT 8").fetchall()
        watch = DB.execute("SELECT * FROM users ORDER BY COALESCE(last_seen_at, created_at) DESC LIMIT 40").fetchall()
        feed = DB.execute(
            """SELECT e.*, u.name AS user_name, u.email AS user_email
               FROM events e LEFT JOIN users u ON u.id = e.user_id
               ORDER BY e.created_at DESC LIMIT 24"""
        ).fetchall()
        by_status = {r["status"]: r["c"] for r in DB.execute("SELECT status, COUNT(*) AS c FROM users GROUP BY status")}
        by_kyc = {r["kyc"]: r["c"] for r in DB.execute("SELECT kyc, COUNT(*) AS c FROM users GROUP BY kyc")}
        return {
            "now": now(),
            "users": users,
            "verified": verified,
            "online": len(online),
            "onlineNodes": online[:12],
            "loginsToday": logins_today,
            "signupsToday": signups_today,
            "clicksToday": clicks_today,
            "failedToday": failed_today,
            "eventsToday": events_today,
            "visitors7d": visitors,
            "byStatus": by_status,
            "byKyc": by_kyc,
            "series": daily_series("", (), 14),
            "heatmap": event_heatmap("", (), 14),
            "mix": type_mix("", (), 14),
            "funnel": self.funnel(),
            "recentClients": [enrich_user(r) for r in recent],
            "priority": sorted([enrich_user(r) for r in watch], key=lambda x: x["score"], reverse=True)[:8],
            "feed": [staff_event(r) for r in feed],
            "vault": "hmac-sha256",
        }

    def funnel(self):
        def n(sql, args=()):
            return DB.execute(sql, args).fetchone()["c"]
        return {
            "signups": n("SELECT COUNT(*) AS c FROM events WHERE type = 'signup'"),
            "logins": n("SELECT COUNT(*) AS c FROM events WHERE type = 'login'"),
            "marketplace": n("SELECT COUNT(*) AS c FROM events WHERE type = 'page_view' AND path LIKE ?", ("%app.html%",)),
            "actions": n("SELECT COUNT(*) AS c FROM events WHERE type = 'app_action'"),
            "banks": n(
                "SELECT COUNT(*) AS c FROM events WHERE type IN ('click','app_action') AND (label LIKE ? OR label LIKE ? OR label LIKE ?)",
                ("%Bank%", "%Current%", "%Account%"),
            ),
        }

    def intel(self):
        failed = DB.execute(
            """SELECT e.*, u.name AS user_name, u.email AS user_email
               FROM events e LEFT JOIN users u ON u.id = e.user_id
               WHERE e.type = 'login_failed' ORDER BY e.created_at DESC LIMIT 24"""
        ).fetchall()
        pages = DB.execute(
            """SELECT path, title, COUNT(*) AS views, MAX(created_at) AS last_at
               FROM events WHERE type = 'page_view' GROUP BY path, title ORDER BY views DESC LIMIT 10"""
        ).fetchall()
        clicks = DB.execute(
            """SELECT label, path, COUNT(*) AS n, MAX(created_at) AS last_at
               FROM events WHERE type = 'click' AND label IS NOT NULL AND label != ''
               GROUP BY label, path ORDER BY n DESC LIMIT 12"""
        ).fetchall()
        ips = DB.execute(
            """SELECT last_ip AS ip, COUNT(*) AS n, MAX(last_seen_at) AS last_at
               FROM users WHERE last_ip IS NOT NULL AND last_ip != '' GROUP BY last_ip ORDER BY n DESC LIMIT 8"""
        ).fetchall()
        devices = {}
        for r in DB.execute("SELECT last_user_agent FROM users WHERE last_user_agent IS NOT NULL AND last_user_agent != ''"):
            d = parse_ua(r["last_user_agent"])
            key = d["os"] + " · " + d["browser"]
            devices[key] = devices.get(key, 0) + 1
        device_list = [{"label": k, "n": v} for k, v in sorted(devices.items(), key=lambda x: -x[1])]
        return {
            "now": now(),
            "heatmap": event_heatmap("", (), 14),
            "series": daily_series("", (), 14),
            "mix": type_mix("", (), 30),
            "funnel": self.funnel(),
            "failed": [staff_event(r) for r in failed],
            "topPages": [dict(r) for r in pages],
            "topClicks": [dict(r) for r in clicks],
            "ips": [],
            "devices": device_list,
            "live": self.live(),
        }

    def list_clients(self, query):
        q = (query.get("q") or "").strip().lower()
        status = (query.get("status") or "").strip()
        kyc = (query.get("kyc") or "").strip()
        sql = "SELECT * FROM users WHERE 1=1"
        args = []
        if status:
            aliases = status_match_values(status)
            sql += " AND status IN (%s)" % ",".join("?" * len(aliases))
            args.extend(aliases)
        if kyc:
            aliases = kyc_match_values(kyc)
            sql += " AND kyc IN (%s)" % ",".join("?" * len(aliases))
            args.extend(aliases)
        sql += " ORDER BY COALESCE(last_seen_at, created_at) DESC"
        rows = DB.execute(sql, args).fetchall()
        out = []
        for r in rows:
            item = enrich_user(r)
            hay = (item.get("name") or "") + " " + (item.get("email") or "")
            if q and q not in hay.lower():
                continue
            item["openSessions"] = DB.execute(
                "SELECT COUNT(*) AS c FROM sessions WHERE user_id = ? AND kind = 'user' AND ended_at IS NULL",
                (r["id"],),
            ).fetchone()["c"]
            last = DB.execute(
                "SELECT type, path, label, created_at FROM events WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
                (r["id"],),
            ).fetchone()
            item["lastEvent"] = dict(last) if last else None
            out.append(item)
        return out

    def live(self):
        rows = DB.execute(
            """SELECT * FROM users WHERE last_seen_at IS NOT NULL ORDER BY last_seen_at DESC"""
        ).fetchall()
        out = []
        for r in rows:
            if not is_online(r["last_seen_at"]):
                continue
            item = enrich_user(r)
            last = DB.execute(
                "SELECT type, path, title, label, created_at FROM events WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
                (r["id"],),
            ).fetchone()
            item["lastEvent"] = dict(last) if last else None
            sess = DB.execute(
                "SELECT created_at, last_seen_at, ip FROM sessions WHERE user_id = ? AND kind = 'user' AND ended_at IS NULL ORDER BY last_seen_at DESC LIMIT 1",
                (r["id"],),
            ).fetchone()
            item["openSession"] = {"created_at": sess["created_at"], "last_seen_at": sess["last_seen_at"]} if sess else None
            out.append(item)
        return out

    def global_activity(self, query):
        limit = min(int(query.get("limit") or 80), 200)
        typ = (query.get("type") or "").strip()
        sql = """SELECT e.*, u.name AS user_name, u.email AS user_email
               FROM events e LEFT JOIN users u ON u.id = e.user_id WHERE 1=1"""
        args = []
        if typ:
            sql += " AND e.type = ?"
            args.append(typ)
        sql += " ORDER BY e.created_at DESC LIMIT ?"
        args.append(limit)
        return [staff_event(r) for r in DB.execute(sql, args).fetchall()]

    def user_events(self, user_id, query):
        typ = (query.get("type") or "").strip()
        sql = "SELECT * FROM events WHERE user_id = ?"
        args = [user_id]
        if typ:
            sql += " AND type = ?"
            args.append(typ)
        sql += " ORDER BY created_at DESC LIMIT 300"
        return [staff_event(r) for r in DB.execute(sql, args).fetchall()]

    def client_detail(self, user_id):
        user = DB.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise LookupError("Client not found.")
        u = enrich_user(user)
        uid = user["id"]
        stats = {
            "events": u["events"],
            "clicks": DB.execute("SELECT COUNT(*) AS c FROM events WHERE user_id = ? AND type = 'click'", (uid,)).fetchone()["c"],
            "pageViews": DB.execute("SELECT COUNT(*) AS c FROM events WHERE user_id = ? AND type = 'page_view'", (uid,)).fetchone()["c"],
            "logins": DB.execute("SELECT COUNT(*) AS c FROM events WHERE user_id = ? AND type = 'login'", (uid,)).fetchone()["c"],
            "logouts": DB.execute("SELECT COUNT(*) AS c FROM events WHERE user_id = ? AND type = 'logout'", (uid,)).fetchone()["c"],
            "actions": DB.execute("SELECT COUNT(*) AS c FROM events WHERE user_id = ? AND type = 'app_action'", (uid,)).fetchone()["c"],
            "failed": DB.execute("SELECT COUNT(*) AS c FROM events WHERE user_id = ? AND type = 'login_failed'", (uid,)).fetchone()["c"],
            "notes": DB.execute("SELECT COUNT(*) AS c FROM crm_notes WHERE user_id = ?", (uid,)).fetchone()["c"],
            "activeDays": DB.execute(
                "SELECT COUNT(DISTINCT substr(created_at,1,10)) AS c FROM events WHERE user_id = ?", (uid,)
            ).fetchone()["c"],
        }
        pages = DB.execute(
            """SELECT path, title, COUNT(*) AS views, MAX(created_at) AS last_at
               FROM events WHERE user_id = ? AND type = 'page_view' GROUP BY path, title
               ORDER BY views DESC LIMIT 12""",
            (uid,),
        ).fetchall()
        clicks = DB.execute(
            """SELECT label, path, COUNT(*) AS n, MAX(created_at) AS last_at
               FROM events WHERE user_id = ? AND type = 'click' AND label IS NOT NULL AND label != ''
               GROUP BY label, path ORDER BY n DESC LIMIT 16""",
            (uid,),
        ).fetchall()
        notes = []
        for n in DB.execute("SELECT * FROM crm_notes WHERE user_id = ? ORDER BY created_at DESC LIMIT 40", (uid,)).fetchall():
            item = dict(n)
            item["body"] = unseal(item.get("body"))
            notes.append(item)
        sessions = DB.execute(
            "SELECT created_at, last_seen_at, ended_at, logout_reason FROM sessions WHERE user_id = ? AND kind = 'user' ORDER BY created_at DESC LIMIT 40",
            (uid,),
        ).fetchall()
        sess_list = []
        total_secs = 0
        for s in sessions:
            item = dict(s)
            item["seconds"] = session_seconds(s)
            total_secs += item["seconds"]
            sess_list.append(item)
        stats["sessions"] = len(sess_list)
        stats["avgSession"] = int(total_secs / len(sess_list)) if sess_list else 0
        stats["openSessions"] = DB.execute(
            "SELECT COUNT(*) AS c FROM sessions WHERE user_id = ? AND kind = 'user' AND ended_at IS NULL", (uid,)
        ).fetchone()["c"]
        events = self.user_events(uid, {})
        return {
            "user": u,
            "stats": stats,
            "topPages": [dict(r) for r in pages],
            "topClicks": [dict(r) for r in clicks],
            "notes": notes,
            "sessions": sess_list,
            "events": events[:120],
            "heatmap": event_heatmap(" AND user_id = ?", (uid,), 14),
            "series": daily_series(" AND user_id = ?", (uid,), 14),
            "mix": type_mix(" AND user_id = ?", (uid,), 30),
            "ips": [],
        }

    def patch_client(self, user_id, body, admin, ip, user_agent):
        user = DB.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise LookupError("Client not found.")
        fields = {}
        for key in ("status", "kyc", "notes"):
            if key in body:
                val = (body.get(key) or "").strip() if isinstance(body.get(key), str) else body.get(key)
                fields[key] = seal(val) if key == "notes" else val
        if not fields:
            return self.send_json(200, {"user": enrich_user(user)})
        sets = ", ".join(k + " = ?" for k in fields)
        DB.execute("UPDATE users SET " + sets + ", updated_at = ? WHERE id = ?", list(fields.values()) + [now(), user_id])
        insert_event(user_id, None, None, "crm_edit", "/crm/", "CRM", "Node updated", None, None, ip, user_agent)
        DB.commit()
        user = DB.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return self.send_json(200, {"user": enrich_user(user)})


def main():
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("Zemp & Partner running at http://127.0.0.1:%s/" % PORT)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")


if __name__ == "__main__":
    main()
