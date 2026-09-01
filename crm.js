(function () {
  "use strict";

  var TOKEN_KEY = "nnfb_crm_token";
  var DEMO_TOKEN = "demo-local";
  var DEMO_STORE = "nnfb_crm_demo";
  var current = "home";
  var selectedId = null;
  var detailTab = "timeline";
  var statusFilter = "";
  var kycFilter = "";
  var typeFilter = "";
  var refreshTimer = null;
  var clockTimer = null;

  function bindPasswordToggles(root) {
    root = root || document;
    var showLabel = "Show password";
    var hideLabel = "Hide password";
    root.querySelectorAll(".pw-wrap").forEach(function (wrap) {
      var input = wrap.querySelector("input");
      var btn = wrap.querySelector(".pw-toggle");
      if (!input || !btn || btn.getAttribute("data-pw-bound")) return;
      btn.setAttribute("data-pw-bound", "1");
      btn.addEventListener("click", function () {
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.classList.toggle("on", show);
        btn.setAttribute("aria-pressed", show ? "true" : "false");
        btn.setAttribute("aria-label", show ? hideLabel : showLabel);
      });
    });
  }

  function token() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }
  function isDemo() { return token() === DEMO_TOKEN; }

  function probeLive() {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 800);
    return fetch("/api/health", { cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) return false;
        return res.json().then(function (data) { return !!(data && data.ok); }).catch(function () { return false; });
      })
      .catch(function () {
        clearTimeout(timer);
        return false;
      });
  }

  function enterStaff(who, liveToken) {
    setToken(liveToken || DEMO_TOKEN);
    localStorage.setItem("nnfb_crm_who", "Staff");
    document.getElementById("admEmail").value = "";
    document.getElementById("admPass").value = "";
    enter();
  }

  function isDemoLogin(email, password) {
    var e = (email || "").trim().toLowerCase();
    var p = (password || "").trim();
    return (e === "test" && p === "test") || (e === "test@test.com" && p === "test");
  }

  function staffMatch(email, password) {
    if (isDemoLogin(email, password)) {
      return Promise.resolve({ staff: false, demo: true });
    }
    return (window.NNGate && window.NNGate.classify)
      ? window.NNGate.classify(email, password)
      : Promise.resolve({ staff: false, demo: false });
  }

  function demoState() {
    try {
      var raw = localStorage.getItem(DEMO_STORE);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { notes: {}, edits: {} };
  }
  function saveDemoState(state) {
    localStorage.setItem(DEMO_STORE, JSON.stringify(state));
  }

  function emptyHeat() {
    var grid = [];
    for (var d = 0; d < 7; d += 1) {
      var row = [];
      for (var h = 0; h < 24; h += 1) row.push((d < 5 && h >= 8 && h <= 18 && (h + d) % 3 === 0) ? 2 + ((h + d) % 4) : 0);
      grid.push(row);
    }
    return grid;
  }
  function demoSeries() {
    var out = [];
    for (var i = 13; i >= 0; i -= 1) {
      var day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      out.push({ day: day, n: i === 0 ? 6 : (i % 5) + 2 });
    }
    return out;
  }

  function firstName(name) {
    return ((name || "").trim().split(/\s+/)[0]) || "Visitor";
  }

  function displayName(u) {
    return firstName((u && (u.name || u.user_name)) || "Visitor");
  }

  function localNodes() {
    var log = [];
    try { log = JSON.parse(localStorage.getItem("nnfb_signal_log") || "[]"); } catch (e) { log = []; }
    var map = {};
    (log || []).forEach(function (e) {
      var id = e.userId || ("vid-" + (e.visitorId || "anon"));
      if (!map[id]) {
        map[id] = {
          id: id,
          name: firstName(e.userName || "Visitor"),
          email: "",
          status: "new",
          kyc: "open",
          online: true,
          last_seen_at: e.created_at,
          login_count: 0,
          events: 0,
          score: 24,
          lastEvent: null,
          _log: []
        };
      }
      var node = map[id];
      node.events += 1;
      node.last_seen_at = e.created_at;
      node.lastEvent = { type: e.type, label: e.label, path: e.path, created_at: e.created_at };
      node._log.push(e);
      if (e.userName) node.name = firstName(e.userName);
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function demoClientBase() {
    var events = [
      { type: "page_view", path: "/", title: "Zemp & Partner", label: "Home", created_at: "2026-08-18T08:12:00.000Z", user_name: "Demo", user_email: "" },
      { type: "click", path: "/", label: "Log in", href: "/login.html", created_at: "2026-08-18T08:12:14.000Z", user_name: "Demo", user_email: "" },
      { type: "login", path: "/login.html", label: "Login succeeded", created_at: "2026-08-18T08:12:44.000Z", user_name: "Demo", user_email: "" },
      { type: "page_view", path: "/app.html", title: "Marketplace", label: "Overview", created_at: "2026-08-18T08:13:02.000Z", user_name: "Demo", user_email: "" },
      { type: "click", path: "/app.html", label: "Banks", created_at: "2026-08-18T08:14:11.000Z", user_name: "Demo", user_email: "" },
      { type: "app_action", path: "/app.html", label: "Account opened: HSBC", created_at: "2026-08-18T09:02:18.000Z", user_name: "Demo", user_email: "" },
      { type: "page_view", path: "/app.html", label: "Overnight", created_at: "2026-08-19T11:20:00.000Z", user_name: "Demo", user_email: "" },
      { type: "login", path: "/login.html", label: "Login succeeded", created_at: "2026-08-24T08:10:00.000Z", user_name: "Demo", user_email: "" },
      { type: "click", path: "/app.html", label: "Activity", created_at: "2026-08-24T08:11:03.000Z", user_name: "Demo", user_email: "" }
    ];
    var user = {
      id: "demo-test-user",
      name: "Demo",
      email: "",
      status: "active",
      kyc: "verified",
      created_at: "2026-01-15T10:00:00.000Z",
      last_login_at: "2026-08-24T08:10:00.000Z",
      last_seen_at: new Date().toISOString(),
      login_count: 12,
      online: true,
      score: 78,
      events: events.length,
      lastEvent: events[events.length - 1],
      openSessions: 1,
      openSession: { created_at: "2026-08-24T08:10:00.000Z", last_seen_at: new Date().toISOString() }
    };
    return { user: user, events: events, extraNotes: (demoState().notes && demoState().notes[user.id]) || [] };
  }

  function demoApi(path, opts) {
    opts = opts || {};
    var method = (opts.method || "GET").toUpperCase();
    var body = opts.body || {};
    var pack = demoClientBase();
    var u = pack.user;
    var events = pack.events.slice().reverse();
    var q = "";
    var id = "";
    var m = path.match(/^\/api\/admin\/clients\/([^/?]+)/);
    if (m) id = decodeURIComponent(m[1]);
    if (path.indexOf("?") >= 0) q = path.split("?")[1];
    var params = {};
    q.split("&").forEach(function (part) {
      var kv = part.split("=");
      if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
    });

    if (method === "POST" && path.indexOf("/api/admin/logout") === 0) return Promise.resolve({ ok: true });
    if (method === "POST" && /\/notes$/.test(path.split("?")[0])) {
      var text = (body.body || "").trim();
      if (!text) return Promise.reject(new Error("Note cannot be empty."));
      var st = demoState();
      st.notes = st.notes || {};
      st.notes[id] = st.notes[id] || [];
      st.notes[id].unshift({ id: "n-" + Date.now(), user_id: id, author: "Thomas", body: text, created_at: new Date().toISOString() });
      saveDemoState(st);
      return Promise.resolve({ ok: true });
    }
    if (method === "PATCH" && m) {
      var st2 = demoState();
      st2.edits = st2.edits || {};
      st2.edits[id] = Object.assign({}, st2.edits[id] || {}, body);
      if (body.password) delete st2.edits[id].password;
      saveDemoState(st2);
      return Promise.resolve({ user: Object.assign({}, u, st2.edits[id]) });
    }
    if (path.indexOf("/api/admin/overview") === 0) {
      return Promise.resolve({
        now: new Date().toISOString(),
        users: 1,
        verified: 1,
        online: 1,
        loginsToday: 1,
        signupsToday: 0,
        clicksToday: 1,
        failedToday: 0,
        eventsToday: pack.events.length,
        visitors7d: 1,
        series: demoSeries(),
        mix: [{ type: "page_view", n: 4 }, { type: "click", n: 3 }, { type: "login", n: 2 }, { type: "app_action", n: 1 }],
        funnel: { signups: 1, logins: 2, marketplace: 4, actions: 1, banks: 1 },
        heatmap: emptyHeat(),
        feed: events.slice(0, 8),
        priority: [u].concat(localNodes().filter(function (n) { return n.id !== u.id; })).slice(0, 8)
      });
    }
    if (path.indexOf("/api/admin/clients") === 0 && !m) {
      var extras = localNodes().filter(function (n) { return n.id !== u.id && n.email !== u.email; });
      var list = [u].concat(extras);
      if (params.q) {
        list = list.filter(function (n) {
          return (n.name + " " + n.email).toLowerCase().indexOf(params.q.toLowerCase()) >= 0;
        });
      }
      if (params.status) list = list.filter(function (n) { return aliasMatch("status", params.status, n.status); });
      if (params.kyc) list = list.filter(function (n) { return aliasMatch("kyc", params.kyc, n.kyc); });
      return Promise.resolve({ clients: list });
    }
    if (path.indexOf("/api/admin/live") === 0) return Promise.resolve({ live: [u].concat(localNodes().filter(function (n) { return n.id !== u.id; })) });
    if (path.indexOf("/api/admin/activity") === 0) {
      var ev = events.concat(localNodes().reduce(function (acc, n) {
        return acc.concat((n._log || []).map(function (e) {
          return {
            type: e.type,
            label: e.label,
            path: e.path,
            created_at: e.created_at,
            user_name: firstName(e.userName || n.name),
            user_email: ""
          };
        }));
      }, []));
      ev.sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
      if (params.type) ev = ev.filter(function (e) { return e.type === params.type; });
      return Promise.resolve({ events: ev.slice(0, 160) });
    }
    if (path.indexOf("/api/admin/intel") === 0) {
      return Promise.resolve({
        heatmap: emptyHeat(),
        funnel: { signups: 1, logins: 2, marketplace: 4, actions: 1, banks: 1 },
        series: demoSeries(),
        mix: [{ type: "page_view", n: 4 }, { type: "click", n: 3 }, { type: "login", n: 2 }],
        topPages: [{ path: "/app.html", title: "Marketplace", views: 5 }, { path: "/", title: "Zemp & Partner", views: 2 }],
        devices: [],
        failed: [],
        ips: [],
        topClicks: [{ label: "Banks", path: "/app.html", n: 1, last_at: "2026-08-18T08:14:11.000Z" }, { label: "Activity", path: "/app.html", n: 1, last_at: "2026-08-24T08:11:03.000Z" }]
      });
    }
    if (m && method === "GET") {
      var node = id === u.id ? u : localNodes().filter(function (n) { return n.id === id; })[0];
      if (!node) return Promise.reject(new Error("Client not found."));
      var nodeEvents = id === u.id ? events : (node._log || []).map(function (e) {
        return { type: e.type, label: e.label, path: e.path, created_at: e.created_at, user_name: node.name, user_email: node.email || "" };
      });
      return Promise.resolve({
        user: node,
        stats: { events: nodeEvents.length, clicks: nodeEvents.filter(function (e) { return e.type === "click"; }).length, pageViews: nodeEvents.filter(function (e) { return e.type === "page_view"; }).length, logins: nodeEvents.filter(function (e) { return e.type === "login"; }).length, logouts: 0, actions: nodeEvents.filter(function (e) { return e.type === "app_action"; }).length, failed: 0, notes: 0, activeDays: 1, sessions: 1, avgSession: 0, openSessions: 1 },
        topPages: [],
        topClicks: [],
        notes: pack.extraNotes,
        sessions: [{ created_at: node.last_seen_at || node.created_at, ended_at: null, seconds: 0 }],
        events: nodeEvents,
        heatmap: emptyHeat(),
        series: demoSeries(),
        mix: [],
        ips: []
      });
    }
    return Promise.resolve({});
  }

  function api(path, opts) {
    opts = opts || {};
    if (isDemo() && path.indexOf("/api/admin/login") !== 0) return demoApi(path, opts);
    var headers = { "Content-Type": "application/json" };
    if (token()) headers.Authorization = "Bearer " + token();
    return fetch(path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401) {
          setToken(null);
          showGate();
          throw new Error("Please sign in again.");
        }
        if (!res.ok) throw new Error((data && data.error) || "Something went wrong.");
        return data;
      });
    }).catch(function (err) {
      if (err && err.message && err.message !== "Failed to fetch") throw err;
      throw new Error("Live server is offline. Sign in again for the local CRM.");
    });
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fmt(ts) {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ts; }
  }
  function fmtDur(sec) {
    sec = Number(sec) || 0;
    if (sec < 60) return sec + "s";
    if (sec < 3600) return Math.round(sec / 60) + "m";
    return (sec / 3600).toFixed(1) + "h";
  }
  var STATUS = { neu: "New", new: "New", aktiv: "Active", active: "Active", beratung: "Advice", advice: "Advice", inaktiv: "Inactive", inactive: "Inactive" };
  var KYC = { offen: "Open", open: "Open", verifiziert: "Verified", verified: "Verified", abgelehnt: "Rejected", rejected: "Rejected" };
  function aliasMatch(kind, filter, value) {
    var status = { new: ["new", "neu"], active: ["active", "aktiv"], advice: ["advice", "beratung"], inactive: ["inactive", "inaktiv"] };
    var kyc = { open: ["open", "offen"], verified: ["verified", "verifiziert"], rejected: ["rejected", "abgelehnt"] };
    var map = kind === "status" ? status : kyc;
    return (map[filter] || [filter]).indexOf(value) >= 0;
  }
  function pill(status) {
    var s = status || "new";
    return '<span class="pill ' + esc(s) + '">' + esc(STATUS[s] || KYC[s] || s) + "</span>";
  }
  function online(u) {
    return '<span class="dot' + (u.online ? " on" : "") + '"></span>' + (u.online ? "Live" : "Idle");
  }
  function toast(msg) {
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2200);
  }
  function eventLabel(e) {
    var map = { page_view: "Page", click: "Click", login: "Login", logout: "Logout", signup: "Sign-up", heartbeat: "Pulse", hidden: "Hidden", visible: "Visible", profile_update: "Profile", app_action: "Action", crm_edit: "Edit", crm_note: "Note", login_failed: "Failed login" };
    return map[e.type] || e.type;
  }
  function deviceLine(d) {
    if (!d) return "—";
    return (d.os || "—") + " · " + (d.browser || "—") + " · " + (d.device || "—");
  }
  function scoreRing(n) {
    n = Number(n) || 0;
    return '<div class="score" style="--p:' + n + '"><span>' + n + "</span></div>";
  }
  function bars(series) {
    var max = 1;
    (series || []).forEach(function (s) { if (s.n > max) max = s.n; });
    return '<div class="bars">' + (series || []).map(function (s) {
      var h = Math.max(6, Math.round((s.n / max) * 100));
      return '<i title="' + esc(s.day) + " · " + s.n + '" style="height:' + h + '%"></i>';
    }).join("") + "</div>";
  }
  function heatHtml(grid) {
    var days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    var max = 1;
    (grid || []).forEach(function (row) { (row || []).forEach(function (n) { if (n > max) max = n; }); });
    var html = "";
    days.forEach(function (d, i) {
      html += "<b>" + d + "</b>";
      (grid[i] || []).forEach(function (n) {
        var a = n ? (0.22 + 0.78 * (n / max)).toFixed(2) : "0.1";
        html += '<i style="--a:' + a + '" title="' + n + '"></i>';
      });
    });
    var hours = "<b></b>";
    for (var h = 0; h < 24; h += 1) hours += "<span>" + (h % 3 === 0 ? h : "") + "</span>";
    return '<div class="heat-wrap"><div class="heat">' + html + '</div><div class="hours">' + hours + "</div></div>";
  }
  function funnelHtml(f) {
    f = f || {};
    var rows = [
      ["Sign-ups", f.signups || 0],
      ["Logins", f.logins || 0],
      ["Marketplace", f.marketplace || 0],
      ["Actions", f.actions || 0],
      ["Banking", f.banks || 0]
    ];
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1]));
    return '<div class="funnel">' + rows.map(function (r) {
      var w = Math.round((r[1] / max) * 100);
      return '<div class="funnel-row"><span>' + esc(r[0]) + '</span><div class="track"><span style="width:' + w + '%"></span></div><b>' + r[1] + "</b></div>";
    }).join("") + "</div>";
  }
  function mixHtml(mix) {
    mix = mix || [];
    var max = 1;
    mix.forEach(function (m) { if (m.n > max) max = m.n; });
    if (!mix.length) return '<p class="muted">No telemetry yet.</p>';
    return '<div class="mix">' + mix.map(function (m) {
      var w = Math.round((m.n / max) * 100);
      return '<div class="mix-row"><span>' + esc(eventLabel({ type: m.type })) + '</span><div class="track"><span style="width:' + w + '%"></span></div><b>' + m.n + "</b></div>";
    }).join("") + "</div>";
  }

  var gate = document.getElementById("gate");
  var app = document.getElementById("app");
  var viewEl = document.getElementById("view");
  var titleEl = document.getElementById("title");

  function showGate() {
    app.classList.remove("open");
    app.style.display = "none";
    gate.classList.add("open");
    gate.style.display = "flex";
    document.getElementById("signal").textContent = "STANDBY";
  }
  function showApp() {
    gate.classList.remove("open");
    gate.style.display = "none";
    app.classList.add("open");
    app.style.display = "flex";
    document.getElementById("signal").textContent = "LINK LIVE";
  }

  document.getElementById("admForm").addEventListener("submit", function (e) {
    e.preventDefault();
    e.stopPropagation();
    var err = document.getElementById("gateErr");
    var btn = document.getElementById("admGo");
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = "Linking…";
    var email = document.getElementById("admEmail").value.trim();
    var password = (document.getElementById("admPass").value || "").trim();
    staffMatch(email, password).then(function (hit) {
      if (!hit.staff && !hit.demo) {
        err.hidden = false;
        err.textContent = "Email or password is incorrect.";
        return;
      }
      var localStaff = { name: "Staff" };
      if (hit.demo) {
        enterStaff(localStaff, DEMO_TOKEN);
        return;
      }
      return probeLive().then(function (up) {
        if (!up) {
          enterStaff(localStaff);
          return;
        }
        return fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, password: password })
        }).then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (res.ok && data.token && data.admin) enterStaff(data.admin, data.token);
            else enterStaff(localStaff);
          });
        }).catch(function () {
          enterStaff(localStaff);
        });
      });
    }).catch(function () {
      err.hidden = false;
      err.textContent = "Email or password is incorrect.";
    }).then(function () {
      btn.disabled = false;
      btn.textContent = "Enter CRM";
    });
    return false;
  });

  document.getElementById("admOut").onclick = function () {
    api("/api/admin/logout", { method: "POST" }).catch(function () {});
    setToken(null);
    document.getElementById("admEmail").value = "";
    document.getElementById("admPass").value = "";
    if (refreshTimer) clearInterval(refreshTimer);
    showGate();
  };
  document.querySelectorAll(".nav").forEach(function (btn) {
    btn.onclick = function () {
      selectedId = null;
      render(btn.getAttribute("data-view"));
    };
  });
  document.getElementById("globalQ").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      selectedId = null;
      render("clients", this.value);
    }
  });

  function tickClock() {
    var el = document.getElementById("clock");
    if (el) el.textContent = new Date().toISOString().slice(11, 19) + "Z";
  }

  function enter() {
    document.getElementById("admWho").textContent = localStorage.getItem("nnfb_crm_who") || "Staff";
    showApp();
    if (!clockTimer) clockTimer = setInterval(tickClock, 1000);
    tickClock();
    render("home");
  }

  function arm(fn, ms) {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(fn, ms || 8000);
  }

  function render(name, extra) {
    current = name;
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    document.querySelectorAll(".nav").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-view") === (name === "client" ? "clients" : name));
    });
    var titles = { home: "CRM", clients: "Nodes", live: "Presence", feed: "Stream", intel: "Intel", client: "Dossier" };
    var kickers = { home: "Command surface", clients: "Client registry", live: "Active sessions", feed: "Event stream", intel: "Pattern deck", client: "Identity file" };
    titleEl.textContent = titles[name] || "CRM";
    document.getElementById("kicker").textContent = kickers[name] || "Command surface";
    if (name === "home") loadHome();
    else if (name === "clients") loadClients(extra || document.getElementById("globalQ").value);
    else if (name === "live") loadLive();
    else if (name === "feed") loadFeed();
    else if (name === "intel") loadIntel();
    else if (name === "client") loadClient(selectedId);
  }

  function kpi(label, val, hint) {
    return '<div class="kpi"><i>' + esc(label) + "</i><b>" + esc(val) + "</b>" + (hint ? "<em>" + esc(hint) + "</em>" : "") + "</div>";
  }

  function feedRow(e) {
    return '<div class="feed-item"><span class="muted">' + fmt(e.created_at) + '</span><div><b>' +
      esc(displayName({ name: e.user_name || e.user_email || "Visitor" })) + '</b><span class="tag">' + esc(eventLabel(e)) + "</span>" +
      esc(e.label || e.path || "") + "</div></div>";
  }

  function clientsTable(list, rich) {
    if (!list || !list.length) return '<p class="muted">No clients yet.</p>';
    return '<table class="table"><thead><tr><th>Node</th><th>Email</th><th>State</th><th>Last signal</th>' +
      (rich ? "<th>Score</th>" : "<th></th>") + "</tr></thead><tbody>" +
      list.map(function (u) {
        return '<tr class="row" data-id="' + esc(u.id) + '"><td><b>' + esc(displayName(u)) + "</b><div class='muted'>" + online(u) +
          ' <span class="seal">sealed</span></div></td><td>' + esc(u.email || "—") + "</td><td>" + pill(u.status) + " " +
          pill(u.kyc) + "</td><td>" + fmt(u.last_seen_at || u.last_login_at) +
          (u.lastEvent ? '<div class="muted">' + esc(eventLabel(u.lastEvent)) + " · " + esc(u.lastEvent.label || u.lastEvent.path || "") + "</div>" : "") +
          "</td>" + (rich
            ? "<td><b>" + esc(u.score || 0) + "</b><div class='muted'>" + esc(u.events || 0) + " events</div></td>"
            : "<td class='muted'>" + esc(u.login_count || 0) + " logins</td>") + "</tr>";
      }).join("") + "</tbody></table>";
  }
  function bindRows() {
    viewEl.querySelectorAll("[data-id]").forEach(function (row) {
      row.onclick = function () {
        selectedId = row.getAttribute("data-id");
        render("client");
      };
    });
  }

  function loadHome() {
    api("/api/admin/overview").then(function (d) {
      viewEl.innerHTML =
        '<div class="kpis">' +
        kpi("Nodes", d.users, (d.verified || 0) + " verified") +
        kpi("Presence", d.online, "last 90s") +
        kpi("Logins", d.loginsToday, "today") +
        kpi("Sign-ups", d.signupsToday, "today") +
        kpi("Clicks", d.clicksToday, "today") +
        kpi("Failed", d.failedToday, "auth rejects") + "</div>" +
        '<div class="card vault-banner"><div><h2>Identity vault</h2><p>Names and emails are sealed at rest. CRM decrypts first name and email after staff auth. Phone, address, tax ID, IP, and device stay off this surface.</p></div><span class="seal">hmac-sha256</span></div>' +
        '<div class="grid3"><div class="card"><div class="card-head"><h2>14-day telemetry</h2><span class="mono">' + esc(d.eventsToday) + " today</span></div>" +
        bars(d.series) + '</div><div class="card"><h2>Conversion funnel</h2>' + funnelHtml(d.funnel) +
        '</div><div class="card"><h2>Signal mix</h2>' + mixHtml(d.mix) + "</div></div>" +
        '<div class="grid2"><div class="card"><div class="card-head"><h2>Activity heatmap</h2><span class="mono">UTC · 14d</span></div>' +
        heatHtml(d.heatmap) + '</div><div class="card"><h2>Live stream</h2><div class="feed">' +
        (d.feed || []).map(feedRow).join("") + "</div></div></div>" +
        '<div class="card"><h2>Priority nodes</h2>' + clientsTable(d.priority, true) + "</div>";
      bindRows();
      arm(function () { if (current === "home") loadHome(); }, 10000);
    }).catch(showErr);
  }

  function loadClients(q) {
    var qs = "?q=" + encodeURIComponent(q || "");
    if (statusFilter) qs += "&status=" + encodeURIComponent(statusFilter);
    if (kycFilter) qs += "&kyc=" + encodeURIComponent(kycFilter);
    api("/api/admin/clients" + qs).then(function (d) {
      viewEl.innerHTML =
        '<div class="filters">' +
        ["", "new", "active", "advice", "inactive"].map(function (s) {
          return '<button class="chip' + (statusFilter === s ? " on" : "") + '" data-st="' + s + '">' + (STATUS[s] || "All states") + "</button>";
        }).join("") +
        ["", "open", "verified", "rejected"].map(function (s) {
          return '<button class="chip' + (kycFilter === s ? " on" : "") + '" data-kyc="' + s + '">' + (KYC[s] || "All KYC") + "</button>";
        }).join("") + "</div>" +
        '<div class="card">' + clientsTable(d.clients, true) + "</div>";
      viewEl.querySelectorAll("[data-st]").forEach(function (b) {
        b.onclick = function () { statusFilter = b.getAttribute("data-st"); loadClients(q); };
      });
      viewEl.querySelectorAll("[data-kyc]").forEach(function (b) {
        b.onclick = function () { kycFilter = b.getAttribute("data-kyc"); loadClients(q); };
      });
      bindRows();
    }).catch(showErr);
  }

  function loadLive() {
    api("/api/admin/live").then(function (d) {
      var nodes = d.live || [];
      var radar = '<div class="radar">' + nodes.map(function (u, i) {
        var ang = (i / Math.max(nodes.length, 1)) * Math.PI * 2 + 0.4;
        var r = 28 + (i % 4) * 12;
        var x = 50 + Math.cos(ang) * r;
        var y = 50 + Math.sin(ang) * r;
        return '<div class="blip" data-id="' + esc(u.id) + '" style="left:' + x + "%;top:" + y + '%"><span>' + esc(displayName(u)) + "</span></div>";
      }).join("") + "</div>";
      viewEl.innerHTML =
        '<div class="kpis">' + kpi("Live nodes", nodes.length, "heartbeat < 90s") +
        kpi("Open sessions", nodes.reduce(function (n, u) { return n + (u.openSession ? 1 : 0); }, 0), "unterminated") +
        kpi("Avg score", nodes.length ? Math.round(nodes.reduce(function (n, u) { return n + (u.score || 0); }, 0) / nodes.length) : 0, "engagement") + "</div>" +
        '<div class="grid2"><div class="card"><h2>Presence field</h2>' + (nodes.length ? radar : '<p class="muted">Nobody is in the CRM right now.</p>') +
        '</div><div class="card"><h2>Active dossiers</h2>' +
        (nodes.length ? nodes.map(function (u) {
          return '<div class="feed-item row" data-id="' + esc(u.id) + '" style="cursor:pointer"><span class="muted">' + fmt(u.last_seen_at) +
            "</span><div><b>" + esc(displayName(u)) + "</b><div class='muted'>" + esc(u.email || "") + "</div>" +
            (u.lastEvent ? '<div class="muted">' + esc(eventLabel(u.lastEvent)) + " · " + esc(u.lastEvent.label || u.lastEvent.path || "") + "</div>" : "") +
            "</div></div>";
        }).join("") : '<p class="muted">Waiting for a client heartbeat.</p>') + "</div></div>";
      bindRows();
      viewEl.querySelectorAll(".blip").forEach(function (b) {
        b.onclick = function () { selectedId = b.getAttribute("data-id"); render("client"); };
      });
      arm(function () { if (current === "live") loadLive(); }, 6000);
    }).catch(showErr);
  }

  function loadFeed() {
    var qs = "?limit=160";
    if (typeFilter) qs += "&type=" + encodeURIComponent(typeFilter);
    api("/api/admin/activity" + qs).then(function (d) {
      var types = ["", "page_view", "click", "login", "logout", "signup", "app_action", "login_failed", "heartbeat"];
      viewEl.innerHTML =
        '<div class="filters">' + types.map(function (t) {
          return '<button class="chip' + (typeFilter === t ? " on" : "") + '" data-ty="' + t + '">' + (t ? eventLabel({ type: t }) : "All signals") + "</button>";
        }).join("") + '</div><div class="card"><h2>Event stream</h2><div class="feed scroll">' +
        (d.events || []).map(feedRow).join("") + "</div></div>";
      viewEl.querySelectorAll("[data-ty]").forEach(function (b) {
        b.onclick = function () { typeFilter = b.getAttribute("data-ty"); loadFeed(); };
      });
      arm(function () { if (current === "feed") loadFeed(); }, 8000);
    }).catch(showErr);
  }

  function loadIntel() {
    api("/api/admin/intel").then(function (d) {
      viewEl.innerHTML =
        '<div class="grid2"><div class="card"><div class="card-head"><h2>Chronos heatmap</h2><span class="mono">14-day UTC</span></div>' +
        heatHtml(d.heatmap) + '</div><div class="card"><h2>Funnel</h2>' + funnelHtml(d.funnel) + bars(d.series) + "</div></div>" +
        '<div class="grid3"><div class="card"><h2>Signal mix</h2>' + mixHtml(d.mix) +
        '</div><div class="card"><h2>Surfaces</h2>' + topPages(d.topPages) +
        '</div><div class="card"><h2>Auth rejects</h2><div class="feed">' +
        ((d.failed || []).length ? d.failed.map(feedRow).join("") : '<p class="muted">No failed logins stored.</p>') +
        "</div></div></div>" +
        '<div class="card"><h2>Hot clicks</h2>' + topClicks(d.topClicks) + "</div>";
      arm(function () { if (current === "intel") loadIntel(); }, 12000);
    }).catch(showErr);
  }

  function topPages(list) {
    if (!list || !list.length) return '<p class="muted">No pages yet.</p>';
    return '<table class="table"><thead><tr><th>Surface</th><th>Views</th></tr></thead><tbody>' +
      list.map(function (p) {
        return "<tr><td><b>" + esc(p.title || p.path) + "</b><div class='muted'>" + esc(p.path) + "</div></td><td>" + p.views + "</td></tr>";
      }).join("") + "</tbody></table>";
  }
  function topClicks(list) {
    if (!list || !list.length) return '<p class="muted">No clicks yet.</p>';
    return '<table class="table"><thead><tr><th>Element</th><th>Page</th><th>Count</th><th>Last</th></tr></thead><tbody>' +
      list.map(function (c) {
        return "<tr><td><b>" + esc(c.label) + "</b></td><td>" + esc(c.path) + "</td><td>" + c.n + "</td><td>" + fmt(c.last_at) + "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  function loadClient(id) {
    if (!id) return render("clients");
    api("/api/admin/clients/" + encodeURIComponent(id)).then(function (d) {
      var u = d.user;
      var st = d.stats || {};
      titleEl.textContent = displayName(u);
      viewEl.innerHTML =
        '<button class="back" id="goClients">← All nodes</button>' +
        '<div class="hero">' + scoreRing(u.score) +
        "<div><h3>" + esc(displayName(u)) + ' <span class="seal">sealed</span></h3><p class="muted">' + esc(u.email || "") +
        "</p><p style='margin-top:8px'>" + online(u) + "</p></div>" +
        "<div>" + pill(u.status) + " " + pill(u.kyc) + "</div></div>" +
        '<div class="statrow">' +
        [["Events", st.events], ["Clicks", st.clicks], ["Pages", st.pageViews], ["Logins", st.logins],
          ["Actions", st.actions], ["Days", st.activeDays], ["Avg session", fmtDur(st.avgSession)], ["Open", st.openSessions]
        ].map(function (x) {
          return "<div><i>" + x[0] + "</i><b>" + esc(x[1]) + "</b></div>";
        }).join("") + "</div>" +
        '<div class="dossier"><div class="card"><h2>Identity</h2>' +
        '<p class="muted">Vault shows first name and email only. Full profile stays encrypted at rest.</p>' +
        '<div class="id-row"><i>First name</i><b>' + esc(displayName(u)) + "</b></div>" +
        '<div class="id-row"><i>Email</i><b>' + esc(u.email || "—") + "</b></div>" +
        '<p class="muted">Created ' + fmt(u.created_at) + " · Last login " + fmt(u.last_login_at) + "</p></div>" +
        '<div><div class="tabs">' +
        [["timeline", "Timeline"], ["signals", "Signals"], ["clicks", "Clicks"], ["pages", "Pages"], ["sessions", "Sessions"], ["notes", "Notes"]].map(function (t) {
          return '<button class="' + (detailTab === t[0] ? "on" : "") + '" data-tab="' + t[0] + '">' + t[1] + "</button>";
        }).join("") + '</div><div class="card" id="detailPane"></div></div></div>';
      paintDetail(d);
      document.getElementById("goClients").onclick = function () { selectedId = null; render("clients"); };
      viewEl.querySelectorAll("[data-tab]").forEach(function (b) {
        b.onclick = function () {
          detailTab = b.getAttribute("data-tab");
          paintDetail(d);
          viewEl.querySelectorAll("[data-tab]").forEach(function (x) { x.classList.toggle("on", x === b); });
        };
      });
    }).catch(showErr);
  }

  function paintDetail(d) {
    var pane = document.getElementById("detailPane");
    if (!pane) return;
    if (detailTab === "timeline") {
      pane.innerHTML = "<h2>What this node did</h2><div class='feed'>" + (d.events || []).map(function (e) {
        return '<div class="feed-item"><span class="muted">' + fmt(e.created_at) + '</span><div><b>' + esc(eventLabel(e)) +
          "</b>" + esc(e.label || "") + (e.path ? '<div class="muted">' + esc(e.path) + (e.href ? " → " + esc(e.href) : "") + "</div>" : "") + "</div></div>";
      }).join("") + "</div>";
    } else if (detailTab === "signals") {
      pane.innerHTML = "<h2>Personal activity</h2>" + heatHtml(d.heatmap) + '<div style="margin:16px 0">' + bars(d.series) + "</div>" +
        mixHtml(d.mix);
    } else if (detailTab === "clicks") {
      pane.innerHTML = "<h2>Top clicks</h2>" + topClicks(d.topClicks);
    } else if (detailTab === "pages") {
      pane.innerHTML = "<h2>Pages visited</h2>" + topPages(d.topPages);
    } else if (detailTab === "sessions") {
      pane.innerHTML = "<h2>Sessions</h2><table class='table'><thead><tr><th>Start</th><th>Span</th></tr></thead><tbody>" +
        (d.sessions || []).map(function (s) {
          return "<tr><td>" + fmt(s.created_at) + "</td><td>" + (s.ended_at ? fmtDur(s.seconds) + " · " + esc(s.logout_reason || "closed") : "<b>open</b> · " + fmtDur(s.seconds)) +
            "</td></tr>";
        }).join("") + "</tbody></table>";
    } else {
      pane.innerHTML = "<h2>Advisor notes</h2>" +
        '<div class="field"><textarea id="noteBody" placeholder="Add a note about this client…"></textarea></div>' +
        '<button class="btn btn-dark" id="addNote">Save note</button>' +
        '<div class="feed" style="margin-top:16px">' + (d.notes || []).map(function (n) {
          return '<div class="feed-item"><span class="muted">' + fmt(n.created_at) + "</span><div><b>" + esc(n.author) + "</b>" + esc(n.body) + "</div></div>";
        }).join("") + "</div>";
      var add = document.getElementById("addNote");
      if (add) add.onclick = function () {
        var body = document.getElementById("noteBody").value;
        api("/api/admin/clients/" + encodeURIComponent(d.user.id) + "/notes", { method: "POST", body: { body: body } }).then(function () {
          toast("Note saved");
          loadClient(d.user.id);
        }).catch(function (e) { toast(e.message); });
      };
    }
  }

  function showErr(e) {
    viewEl.innerHTML = '<div class="card"><p class="err" style="display:block">' + esc(e.message) + "</p></div>";
  }

  window.NNLattice = { enter: enter };

  document.getElementById("admEmail").value = "";
  document.getElementById("admPass").value = "";
  bindPasswordToggles();
  if (isDemo()) {
    enter();
  } else if (token()) {
    probeLive().then(function (up) {
      if (!up) {
        setToken(null);
        showGate();
        return;
      }
      return api("/api/admin/overview").then(function () {
        enter();
      }).catch(function () {
        setToken(null);
        showGate();
      });
    });
  } else {
    showGate();
  }
})();
