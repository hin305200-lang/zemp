(function () {
  "use strict";

  var SESSION_KEY = "nnfb_session";
  var TOKEN_KEY = "nnfb_token";
  var VISITOR_KEY = "nnfb_vid";
  var DEMO_TOKEN = "demo-local";

  function demoUser(fields) {
    fields = fields || {};
    return {
      id: fields.id || "demo-test-user",
      name: fields.name || "Demo",
      email: fields.email || "",
      phone: fields.phone || "",
      address: fields.address || "",
      tax_id: fields.tax_id || fields.taxId || "",
      status: "active",
      kyc: "verified",
      created_at: "2026-01-15T10:00:00.000Z"
    };
  }

  function demoCreds(email, password) {
    return {
      email: (email || "").trim().toLowerCase(),
      password: (password || "").trim()
    };
  }

  function visitorId() {
    var id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || ("v-" + Date.now() + "-" + Math.random().toString(16).slice(2));
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(session, token) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (session === null) localStorage.removeItem(TOKEN_KEY);
  }

  function toSession(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      address: user.address || "",
      taxId: user.tax_id || user.taxId || "",
      status: user.status || "",
      kyc: user.kyc || "",
      createdAt: user.created_at || user.createdAt
    };
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = { "Content-Type": "application/json" };
    var token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var wait = opts.timeout || 8000;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, wait);
    return fetch(path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.error) || "Request failed.");
          err.status = res.status;
          throw err;
        }
        return data;
      });
    }).catch(function (err) {
      clearTimeout(timer);
      if (err.status) throw err;
      throw new Error("Server unavailable. Please start the Zemp & Partner server (python3 server.py).");
    });
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function signup(data) {
    var name = (data.name || "").trim();
    var email = (data.email || "").trim().toLowerCase();
    var phone = (data.phone || "").trim();
    var password = data.password || "";
    var confirm = data.confirm || "";
    if (!name) return Promise.reject(new Error("Please enter your name."));
    if (!validEmail(email)) return Promise.reject(new Error("Please enter a valid email address."));
    if (password.length < 8) return Promise.reject(new Error("Password must be at least 8 characters."));
    if (password.length > 128) return Promise.reject(new Error("Password is too long."));
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return Promise.reject(new Error("Use at least one letter and one number."));
    }
    if (password !== confirm) return Promise.reject(new Error("Passwords do not match."));
    return probeLive().then(function (up) {
      if (!up) return Promise.reject(new Error("Account service is unavailable. Please try again in a moment."));
      return api("/api/signup", {
        method: "POST",
        timeout: 15000,
        body: { name: name, email: email, phone: phone, password: password, confirm: confirm, visitorId: visitorId() }
      }).then(function (res) {
        if (!res || !res.token || !res.user) {
          throw new Error("Account could not be created. Please try again.");
        }
        setSession(toSession(res.user), res.token);
        return res.user;
      });
    }).catch(function (err) {
      if (err && err.status === 400) throw err;
      if (err && err.message && err.message.indexOf("unavailable") >= 0) throw err;
      if (err && err.message && err.message.indexOf("letter") >= 0) throw err;
      throw new Error(err && err.message ? err.message : "Account may already exist, or the server timed out. Try signing in.");
    });
  }

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

  function enterStaff(admin, token) {
    localStorage.setItem("nnfb_crm_token", token);
    localStorage.setItem("nnfb_crm_who", "Staff");
    window.location.replace("crm/");
    return { staff: true };
  }

  function login(data) {
    var creds = demoCreds(data.email, data.password);
    var gate = window.NNGate && window.NNGate.classify
      ? window.NNGate.classify(creds.email, creds.password)
      : Promise.resolve({ staff: false, demo: false });
    return gate.then(function (hit) {
      if (hit.staff) {
        return probeLive().then(function (up) {
          if (!up) return enterStaff({ name: "Staff" }, DEMO_TOKEN);
          return api("/api/login", {
            method: "POST",
            body: { email: creds.email, password: creds.password, visitorId: visitorId() }
          }).then(function (res) {
            if (res.kind === "staff" && res.token) return enterStaff(res.admin || { name: "Staff" }, res.token);
            return enterStaff({ name: "Staff" }, DEMO_TOKEN);
          }).catch(function () {
            return enterStaff({ name: "Staff" }, DEMO_TOKEN);
          });
        });
      }
      return probeLive().then(function (up) {
        if (!up && hit.demo) {
          setSession(toSession(demoUser({ email: creds.email })), DEMO_TOKEN);
          return getSession();
        }
        return api("/api/login", {
          method: "POST",
          body: {
            email: creds.email,
            password: creds.password,
            visitorId: visitorId()
          }
        }).then(function (res) {
          if (res.kind === "staff" && res.token) {
            return enterStaff(res.admin || { name: "Staff" }, res.token);
          }
          setSession(toSession(res.user), res.token);
          return res.user;
        }).catch(function (err) {
          if (hit.demo) {
            setSession(toSession(demoUser({ email: creds.email })), DEMO_TOKEN);
            return getSession();
          }
          throw err;
        });
      });
    });
  }

  function logout() {
    var token = getToken();
    if (token) {
      api("/api/logout", { method: "POST", body: { visitorId: visitorId(), path: location.pathname } }).catch(function () {});
    }
    setSession(null);
  }

  function refreshMe() {
    if (!getToken()) return Promise.resolve(getSession());
    if (getToken() === DEMO_TOKEN) return Promise.resolve(getSession());
    return api("/api/me").then(function (res) {
      setSession(toSession(res.user), getToken());
      return getSession();
    }).catch(function (err) {
      if (err.status === 401) setSession(null);
      return getSession();
    });
  }

  function updateProfile(fields) {
    return api("/api/me", { method: "PATCH", body: Object.assign({ visitorId: visitorId() }, fields) }).then(function (res) {
      setSession(toSession(res.user), getToken());
      return res.user;
    }).catch(function () {
      var current = getSession() || {};
      var next = Object.assign({}, current, fields);
      if (fields.taxId) next.taxId = fields.taxId;
      setSession(next, getToken() || DEMO_TOKEN);
      return next;
    });
  }

  function firstName(session) {
    return ((session && session.name) || "Account").split(" ")[0];
  }

  function paintNav() {
    var session = getSession();
    var loginEl = document.querySelector("[data-auth='login']");
    var signupEl = document.querySelector("[data-auth='signup']");
    var accountEl = document.querySelector("[data-auth='account']");
    var logoutEl = document.querySelector("[data-auth='logout']");

    if (session) {
      if (loginEl) loginEl.hidden = true;
      if (signupEl) signupEl.hidden = true;
      if (accountEl) {
        accountEl.hidden = false;
        accountEl.textContent = firstName(session);
      }
      if (logoutEl) logoutEl.hidden = false;
    } else {
      if (loginEl) loginEl.hidden = false;
      if (signupEl) signupEl.hidden = false;
      if (accountEl) accountEl.hidden = true;
      if (logoutEl) logoutEl.hidden = true;
    }
  }

  function showError(form, message) {
    var box = form.querySelector("[data-auth-error]");
    if (!box) return;
    box.hidden = !message;
    box.textContent = message || "";
  }

  function bindForms() {
    var signupForm = document.querySelector("[data-auth-form='signup']");
    if (signupForm) {
      if (getSession() && getToken() !== DEMO_TOKEN) {
        window.location.replace("app.html");
        return;
      }
      if (getToken() === DEMO_TOKEN) setSession(null);
      signupForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var btn = signupForm.querySelector("[type='submit']");
        showError(signupForm, "");
        if (btn) btn.disabled = true;
        signup({
          name: signupForm.name.value,
          email: signupForm.email.value,
          phone: signupForm.phone ? signupForm.phone.value : "",
          password: signupForm.password.value,
          confirm: signupForm.confirm.value
        }).then(function () {
          window.location.href = "app.html";
        }).catch(function (err) {
          showError(signupForm, err.message || "Account could not be created.");
          if (btn) btn.disabled = false;
        });
      });
    }

    var loginForm = document.querySelector("[data-auth-form='login']");
    if (loginForm) {
      if (getSession()) {
        window.location.replace("app.html");
        return;
      }
      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var btn = loginForm.querySelector("[type='submit']");
        showError(loginForm, "");
        if (btn) btn.disabled = true;
        login({
          email: loginForm.email.value,
          password: loginForm.password.value
        }).then(function (user) {
          if (user && user.staff) return;
          window.location.href = "app.html";
        }).catch(function (err) {
          showError(loginForm, err.message || "Sign-in failed.");
          if (btn) btn.disabled = false;
        });
      });
    }

    var accountRoot = document.querySelector("[data-auth-account]");
    if (accountRoot) {
      if (getSession()) window.location.replace("app.html");
      else window.location.replace("login.html");
      return;
    }
  }

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

  function bindLogout() {
    document.querySelectorAll("[data-auth='logout']").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        logout();
        window.location.href = "index.html";
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    refreshMe().then(function () {
      paintNav();
      bindLogout();
      bindForms();
      bindPasswordToggles();
    });
  });

  window.NNAuth = {
    getSession: getSession,
    getToken: getToken,
    visitorId: visitorId,
    logout: logout,
    paintNav: paintNav,
    signup: signup,
    login: login,
    updateProfile: updateProfile,
    api: api,
    bindPasswordToggles: bindPasswordToggles
  };
})();
