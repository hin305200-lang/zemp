(function () {
  "use strict";
  if (/\/crm(\.html|\/|$)/i.test(location.pathname)) return;

  var queue = [];
  var flushTimer = null;
  var LOG_KEY = "nnfb_signal_log";
  var lastScrollMark = 0;

  function visitorId() {
    return (window.NNAuth && window.NNAuth.visitorId && window.NNAuth.visitorId()) || localStorage.getItem("nnfb_vid");
  }

  function token() {
    return (window.NNAuth && window.NNAuth.getToken && window.NNAuth.getToken()) || localStorage.getItem("nnfb_token");
  }

  function sessionBits() {
    var s = window.NNAuth && window.NNAuth.getSession && window.NNAuth.getSession();
    if (!s) return { userId: "", userName: "", userEmail: "" };
    var name = (s.name || "").trim().split(" ")[0] || "";
    return { userId: s.id || "", userName: name, userEmail: s.email || "" };
  }

  function persist(ev) {
    var bits = sessionBits();
    var row = Object.assign({
      created_at: new Date().toISOString(),
      visitorId: visitorId(),
      userId: bits.userId,
      userName: bits.userName
    }, ev);
    var list = [];
    try { list = JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    list.push(row);
    localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(-500)));
  }

  function enqueue(ev) {
    var item = Object.assign({
      path: location.pathname + location.hash,
      title: document.title
    }, ev);
    persist(item);
    queue.push(item);
    if (queue.length >= 6) flush();
    else if (!flushTimer) flushTimer = setTimeout(flush, 900);
  }

  function flush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (!queue.length) return;
    var batch = queue.splice(0, 120);
    var headers = { "Content-Type": "application/json" };
    var t = token();
    if (t) headers.Authorization = "Bearer " + t;
    fetch("/api/events", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ visitorId: visitorId(), events: batch }),
      keepalive: true
    }).catch(function () {});
  }

  function isSecretField(el) {
    if (!el || !el.matches) return false;
    return el.matches("input[type='password'], input[name='iban'], input[id*='iban' i], input[id*='tax' i], input[autocomplete='cc-number']");
  }

  function labelFrom(el) {
    if (!el || el === document || el === document.body) return "";
    if (isSecretField(el)) return (el.getAttribute("name") || el.id || "secure-field");
    var t = (el.getAttribute && (el.getAttribute("aria-label") || el.getAttribute("data-view") || el.getAttribute("data-open") || el.getAttribute("data-go"))) || "";
    if (!t) t = (el.innerText || el.textContent || el.getAttribute("href") || el.getAttribute("name") || "").replace(/\s+/g, " ").trim();
    return t.slice(0, 160);
  }

  function trackClick(e) {
    var el = e.target;
    if (!el) return;
    if (el.closest && el.closest("input[type='password']")) {
      enqueue({ type: "click", label: "Secure field", extra: { kind: "secure" } });
      return;
    }
    if (el.closest && el.closest("input, textarea, select")) {
      var field = el.closest("input, textarea, select");
      enqueue({
        type: "click",
        label: "Field " + ((field && (field.getAttribute("name") || field.id || field.tagName)) || "input"),
        extra: { kind: "field" }
      });
      return;
    }
    var hit = el.closest ? (el.closest("a, button, summary, [data-view], [data-open], [data-go], [data-acct], [data-connect], [data-pick], [role='button']") || el) : el;
    var href = hit.getAttribute && hit.getAttribute("href");
    enqueue({
      type: "click",
      label: labelFrom(hit) || labelFrom(el) || (hit.tagName || "node"),
      href: href || null,
      extra: { tag: (hit.tagName || "").toLowerCase() }
    });
  }

  function heartbeat() {
    enqueue({ type: "heartbeat", label: "Session active" });
    var headers = { "Content-Type": "application/json" };
    var t = token();
    if (t) headers.Authorization = "Bearer " + t;
    fetch("/api/heartbeat", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ visitorId: visitorId(), path: location.pathname }),
      keepalive: true
    }).catch(function () {});
  }

  function action(label, extra) {
    enqueue({ type: "app_action", label: label, extra: extra || null });
    flush();
  }

  function view(name) {
    enqueue({ type: "view", label: "View " + name, extra: { view: name } });
    flush();
  }

  document.addEventListener("click", trackClick, true);
  document.addEventListener("submit", function (e) {
    var form = e.target;
    enqueue({
      type: "submit",
      label: "Form " + ((form && (form.getAttribute("data-auth-form") || form.id || form.getAttribute("action"))) || "submit")
    });
    flush();
  }, true);
  document.addEventListener("change", function (e) {
    var el = e.target;
    if (!el || isSecretField(el)) return;
    if (el.matches && el.matches("select, input[type='checkbox'], input[type='radio']")) {
      enqueue({ type: "change", label: "Change " + (el.getAttribute("name") || el.id || el.tagName) });
    }
  }, true);
  window.addEventListener("hashchange", function () {
    enqueue({ type: "nav", label: "Hash " + location.hash });
  });
  window.addEventListener("popstate", function () {
    enqueue({ type: "nav", label: "History" });
  });
  window.addEventListener("scroll", function () {
    var doc = document.documentElement;
    var max = (doc.scrollHeight - doc.clientHeight) || 1;
    var pct = Math.min(100, Math.round((window.scrollY / max) * 100));
    var mark = pct >= 90 ? 90 : pct >= 50 ? 50 : pct >= 25 ? 25 : 0;
    if (mark && mark > lastScrollMark) {
      lastScrollMark = mark;
      enqueue({ type: "scroll", label: "Scroll " + mark + "%" });
    }
  }, { passive: true });
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", function () {
    enqueue({ type: document.hidden ? "hidden" : "visible", label: document.hidden ? "Tab in background" : "Tab active again" });
    flush();
  });

  enqueue({ type: "page_view", label: document.title });
  setInterval(heartbeat, 25000);
  setTimeout(flush, 400);

  window.NNTrack = { action: action, view: view, flush: flush };
})();
