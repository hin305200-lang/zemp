(function () {
  "use strict";

  var session = window.NNAuth && window.NNAuth.getSession();
  if (!session) {
    window.location.replace("login.html");
    return;
  }

  var B = window.NNBanks;
  if (!B) {
    document.body.innerHTML = '<p style="font-family:Inter,sans-serif;padding:48px;max-width:440px">The marketplace could not load. Refresh the page, or open <a href="app.html">app.html</a> again.</p>';
    return;
  }
  var STORE = "nnfb_book_" + session.id;
  var TITLES = {
    overview: "Overview",
    accounts: "Accounts",
    banks: "Banks",
    activity: "Activity",
    market: "Marketplace",
    savings: "Overnight",
    cds: "Term deposits",
    etf: "ETF-Portfolios",
    account: "Profile & security",
    acct: "Account"
  };

  var PARTNERS = [
    { id: "quenzia", name: "Quenzia Direct", country: "Germany", kind: "Bank", shield: "EdB up to €100,000" },
    { id: "nordvia", name: "Nordvia Bank", country: "Sweden", kind: "Bank", shield: "Deposit protection SE" },
    { id: "hallovar", name: "Hallovar Credit union", country: "Austria", kind: "Credit union", shield: "Deposit protection AT" },
    { id: "tresmo", name: "Tresmo Bank", country: "Netherlands", kind: "Bank", shield: "DGS up to €100,000" },
    { id: "kyndal", name: "Kyndal Wealth", country: "Germany", kind: "Custodian", shield: "Segregated assets / ETF" },
    { id: "lumenix", name: "Lumenix Sparkasse partner", country: "Italy", kind: "Bank", shield: "FITD up to €100,000" },
    { id: "bravura", name: "Bravura Credit Union", country: "France", kind: "Credit union", shield: "FGDR up to €100,000" }
  ];

  var PRODUCTS = [
    { id: "q-flex", partner: "quenzia", type: "savings", name: "Overnight Flex", rate: 3.8, min: 1, notice: "available daily", region: "EU" },
    { id: "n-save", partner: "nordvia", type: "savings", name: "Nordvia Savings", rate: 3.65, min: 1, notice: "available daily", region: "EU" },
    { id: "h-cash", partner: "hallovar", type: "savings", name: "Members Overnight", rate: 3.55, min: 500, notice: "available daily", region: "AT/DE" },
    { id: "t-easy", partner: "tresmo", type: "savings", name: "Easy Savings", rate: 3.4, min: 1, notice: "available daily", region: "EU" },
    { id: "q-cd12", partner: "quenzia", type: "cd", name: "Term deposits 12 months", rate: 3.15, min: 2500, term: 12, region: "EU" },
    { id: "h-cd24", partner: "hallovar", type: "cd", name: "Term deposits 24 months", rate: 3.35, min: 2500, term: 24, region: "AT/DE" },
    { id: "t-cd36", partner: "tresmo", type: "cd", name: "Term deposits 36 months", rate: 3.5, min: 5000, term: 36, region: "EU" },
    { id: "l-cd6", partner: "lumenix", type: "cd", name: "Term deposits 6 months", rate: 2.95, min: 1000, term: 6, region: "IT/DE" },
    { id: "b-cd12", partner: "bravura", type: "cd", name: "Term deposits 12 months", rate: 3.2, min: 2500, term: 12, region: "FR/DE" },
    { id: "k-cons", partner: "kyndal", type: "etf", name: "Conservative 20/80", ter: 0.18, stocks: 20, bonds: 80, region: "DE/AT/NL", goal: "Capital preservation with modest growth" },
    { id: "k-bal", partner: "kyndal", type: "etf", name: "Balanced 40/60", ter: 0.2, stocks: 40, bonds: 60, region: "DE/AT/NL", goal: "Steady build without single stocks" },
    { id: "k-core", partner: "kyndal", type: "etf", name: "Core World 60/40", ter: 0.16, stocks: 60, bonds: 40, region: "DE/AT", goal: "Broad world market, low cost" }
  ];

  function partner(id) { return PARTNERS.find(function (p) { return p.id === id; }); }
  function product(id) { return PRODUCTS.find(function (p) { return p.id === id; }); }
  function typeLabel(t) { return t === "savings" ? "Overnight" : t === "cd" ? "Term deposits" : "ETF"; }
  function pill(t) { return '<span class="pill ' + (t === "savings" ? "save" : t === "cd" ? "cd" : "etf") + '">' + typeLabel(t) + "</span>"; }
  function eur(n) {
    return (Number(n) || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }
  function pct(n) { return Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " %"; }
  function initials(name) {
    return (name || "ZP").split(" ").filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase();
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch (e) { return iso; }
  }
  function uid(prefix) { return (prefix || "id") + "-" + Date.now() + "-" + Math.floor(Math.random() * 9999); }

  function isDemoUser() {
    return session.id === "demo-test-user";
  }

  function defaultProfile() {
    return {
      address: "",
      taxId: "",
      kyc: "verified",
      twoFa: true,
      notifyEmail: true,
      notifyPush: false
    };
  }

  function demoBook() {
    return {
      v: 3,
      cash: 4220.15,
      defaultAccountId: "acc-hsbc-checking",
      linkedBanks: ["hsbc", "deutsche", "n26", "dkb", "commerzbank"],
      profile: defaultProfile(),
      revealed: {},
      accounts: [
        { id: "acc-hsbc-checking", bankId: "hsbc", type: "checking", name: "HSBC Premier Current", nickname: "Main account", iban: B.fakeIban("hsbc", 1), bic: "TUBDDEDDXXX", currency: "EUR", balance: 12450.2, rate: 0, status: "active", openedAt: "2024-06-12T09:00:00.000Z", lastSync: "2026-08-25T08:12:00.000Z" },
        { id: "acc-hsbc-savings", bankId: "hsbc", type: "savings", name: "HSBC Premier Savings", nickname: "HSBC Reserve", iban: B.fakeIban("hsbc", 2), bic: "TUBDDEDDXXX", currency: "EUR", balance: 8200, rate: 2.15, status: "active", openedAt: "2025-01-08T09:00:00.000Z", lastSync: "2026-08-25T08:12:00.000Z" },
        { id: "acc-deutsche-checking", bankId: "deutsche", type: "checking", name: "Deutsche Bank Current", nickname: "DB Current", iban: B.fakeIban("deutsche", 1), bic: "DEUTDEFFXXX", currency: "EUR", balance: 3280.4, rate: 0, status: "active", openedAt: "2022-03-01T09:00:00.000Z", lastSync: "2026-08-25T07:40:00.000Z" },
        { id: "acc-n26-checking", bankId: "n26", type: "checking", name: "N26 Standard", nickname: "Everyday", iban: B.fakeIban("n26", 1), bic: "NTSBDEB1XXX", currency: "EUR", balance: 1105.22, rate: 0, status: "active", openedAt: "2023-11-20T09:00:00.000Z", lastSync: "2026-08-25T08:01:00.000Z" },
        { id: "acc-dkb-card", bankId: "dkb", type: "card", name: "DKB Visa Debit", nickname: "Travel card", iban: B.fakeIban("dkb", 2), bic: "BYLADEM1001", currency: "EUR", balance: 890.12, rate: 0, status: "active", openedAt: "2021-09-04T09:00:00.000Z", lastSync: "2026-08-24T22:10:00.000Z" },
        { id: "acc-cbk-savings", bankId: "commerzbank", type: "savings", name: "Commerzbank Extra", nickname: "CBK Extra", iban: B.fakeIban("commerzbank", 2), bic: "COBADEFFXXX", currency: "EUR", balance: 6000, rate: 1.9, status: "active", openedAt: "2025-09-15T09:00:00.000Z", lastSync: "2026-08-25T06:55:00.000Z" }
      ],
      holdings: [
        { id: "d1", productId: "q-flex", amount: 18500, openedAt: "2026-02-04T09:00:00.000Z" },
        { id: "d2", productId: "h-cd24", amount: 15200, openedAt: "2026-03-12T09:00:00.000Z" },
        { id: "d3", productId: "k-cons", amount: 11000, openedAt: "2026-04-01T09:00:00.000Z" }
      ],
      transactions: [
        { id: "t1", at: "2026-08-21T08:02:00.000Z", accountId: "acc-hsbc-checking", title: "Salary Horizon Media Ltd", amount: 4200, category: "income" },
        { id: "t2", at: "2026-08-19T11:14:00.000Z", accountId: "wallet", title: "Investment Quenzia Overnight Flex", amount: -2500, category: "investment" },
        { id: "t3", at: "2026-08-18T18:22:00.000Z", accountId: "acc-n26-checking", title: "REWE Berlin Mitte", amount: -64.12, category: "shopping" },
        { id: "t4", at: "2026-08-15T09:00:00.000Z", accountId: "acc-hsbc-savings", title: "Interest HSBC Premier Savings", amount: 14.68, category: "interest" },
        { id: "t5", at: "2026-08-12T07:30:00.000Z", accountId: "acc-deutsche-checking", title: "Rent · Spree Housing", amount: -1450, category: "housing" },
        { id: "t6", at: "2026-08-10T16:40:00.000Z", accountId: "acc-n26-checking", title: "Trade Republic savings plan", amount: -200, category: "investment" },
        { id: "t7", at: "2026-08-08T21:05:00.000Z", accountId: "acc-dkb-card", title: "Lufthansa · FRA-LHR", amount: -289, category: "travel" },
        { id: "t8", at: "2026-08-04T10:12:00.000Z", accountId: "acc-hsbc-checking", title: "Transfer → Zemp & Partner", amount: -1500, category: "transfer" },
        { id: "t9", at: "2026-08-04T10:12:30.000Z", accountId: "wallet", title: "Incoming from HSBC Premier Current", amount: 1500, category: "transfer" },
        { id: "t10", at: "2026-07-30T12:00:00.000Z", accountId: "acc-cbk-savings", title: "Interest Commerzbank Extra", amount: 9.5, category: "interest" }
      ]
    };
  }

  function normalizeBook(raw) {
    var book = raw && typeof raw === "object" ? raw : {};
    if (!Array.isArray(book.holdings)) book.holdings = [];
    if (typeof book.cash !== "number") book.cash = 0;
    if (!book.profile) book.profile = defaultProfile();
    if (!Array.isArray(book.accounts)) book.accounts = [];
    if (!Array.isArray(book.transactions)) book.transactions = [];
    if (!Array.isArray(book.linkedBanks)) book.linkedBanks = [];
    if (!book.revealed) book.revealed = {};
    book.v = 3;
    return book;
  }

  function emptyBook() {
    return normalizeBook({
      v: 3,
      cash: 0,
      holdings: [],
      accounts: [],
      transactions: [],
      linkedBanks: [],
      profile: {
        address: "",
        taxId: "",
        kyc: "open",
        twoFa: false,
        notifyEmail: true,
        notifyPush: false
      }
    });
  }

  function loadBook() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (isDemoUser() && parsed.v !== 3) {
          var demo = demoBook();
          localStorage.setItem(STORE, JSON.stringify(demo));
          return demo;
        }
        if (!isDemoUser() && !(Number(parsed.v) >= 2)) {
          var fresh = emptyBook();
          localStorage.setItem(STORE, JSON.stringify(fresh));
          return fresh;
        }
        return normalizeBook(parsed);
      }
    } catch (e) {}
    if (isDemoUser()) {
      var demo = demoBook();
      localStorage.setItem(STORE, JSON.stringify(demo));
      return demo;
    }
    var empty = emptyBook();
    localStorage.setItem(STORE, JSON.stringify(empty));
    return empty;
  }
  function saveBook() { localStorage.setItem(STORE, JSON.stringify(book)); }
  var book = loadBook();

  function walletAccount() {
    return {
      id: "wallet",
      bankId: "nnfinanz",
      type: "wallet",
      name: "Zemp & Partner settlement",
      nickname: "Settlement account",
      iban: B.fakeIban("nnfinanz", 1),
      bic: "NNFBDEBBXXX",
      currency: "EUR",
      balance: book.cash,
      rate: 0,
      status: "active",
      locked: true,
      openedAt: session.createdAt || "2026-01-15T10:00:00.000Z",
      lastSync: new Date().toISOString()
    };
  }
  function accounts() { return [walletAccount()].concat(book.accounts); }
  function findAccount(id) { return accounts().find(function (a) { return a.id === id; }); }
  function bankCash() {
    return book.accounts.reduce(function (s, a) { return s + (Number(a.balance) || 0); }, 0);
  }
  function holdingValue() {
    return book.holdings.reduce(function (s, h) { return s + h.amount; }, 0);
  }
  function total() { return book.cash + bankCash() + holdingValue(); }
  function blendedRate() {
    var w = holdingValue();
    if (!w) return 0;
    return book.holdings.reduce(function (s, h) {
      var p = product(h.productId);
      var r = p && p.rate ? p.rate : (p && p.type === "etf" ? 3.2 : 0);
      return s + (h.amount / w) * r;
    }, 0);
  }
  function linkedBankObjs() {
    return book.linkedBanks.map(B.get).filter(Boolean);
  }
  function maskIban(iban) {
    var clean = (iban || "").replace(/\s/g, "");
    if (clean.length < 8) return "••••";
    return clean.slice(0, 4) + " •••• •••• " + clean.slice(-4);
  }
  function showIban(acc) {
    return book.revealed[acc.id] ? acc.iban : maskIban(acc.iban);
  }
  function addTx(tx) {
    book.transactions.unshift({
      id: uid("tx"),
      at: new Date().toISOString(),
      accountId: tx.accountId,
      title: tx.title,
      amount: tx.amount,
      category: tx.category || "other"
    });
  }
  function setBalance(accId, next) {
    if (accId === "wallet") {
      book.cash = next;
      return;
    }
    var acc = book.accounts.find(function (a) { return a.id === accId; });
    if (acc) acc.balance = next;
  }
  function catLabel(c) {
    return ({
      einkommen: "Income", income: "Income",
      anlage: "Investment", investment: "Investment",
      einkauf: "Shopping", shopping: "Shopping",
      zinsen: "Interest", interest: "Interest",
      wohnen: "Housing", housing: "Housing",
      reise: "Travel", travel: "Travel",
      transfer: "Transfer",
      einzahlung: "Deposit", deposit: "Deposit",
      sonstiges: "Activity", other: "Activity"
    })[c] || "Activity";
  }

  var viewEl = document.getElementById("view");
  var titleEl = document.getElementById("pageTitle");
  var current = "overview";
  var extra = null;
  var bankQuery = "";

  var nameEl = document.getElementById("userName");
  var avatarEl = document.getElementById("userAvatar");
  if (nameEl) nameEl.textContent = session.name || "—";
  if (avatarEl) avatarEl.textContent = initials(session.name);

  function toast(msg) {
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2400);
  }

  function closeModal() {
    var m = document.querySelector(".modal-bg");
    if (m) m.remove();
  }

  function openModal(html, onReady, wide) {
    closeModal();
    var wrap = document.createElement("div");
    wrap.className = "modal-bg";
    wrap.innerHTML = '<div class="modal' + (wide ? " wide" : "") + '">' + html + "</div>";
    wrap.addEventListener("click", function (e) { if (e.target === wrap) closeModal(); });
    document.body.appendChild(wrap);
    if (onReady) onReady(wrap.querySelector(".modal"));
  }

  function contactAdvisor(title, body) {
    openModal(
      "<h3>" + title + "</h3>" +
      "<p>" + body + "</p>" +
      "<p>Zemp & Partner Asset Advisory AG<br>Lindenstrasse 10, 6340 Baar</p>" +
      '<div class="actions"><button class="btn btn-dark" id="advOk">Close</button></div>',
      function (modal) {
        modal.querySelector("#advOk").onclick = closeModal;
      }
    );
  }

  function depositFlow() {
    if (!isDemoUser()) {
      contactAdvisor("Deposit", "To add funds, please contact your client adviser.");
      return;
    }
    var opts = accounts().map(function (a) {
      return '<option value="' + esc(a.id) + '">' + esc(a.nickname) + " · " + eur(a.balance) + "</option>";
    }).join("");
    openModal(
      "<h3>Deposit</h3><p>Simulated funds — choose the destination account.</p>" +
      '<div class="field"><label for="depTo">Account</label><select id="depTo">' + opts + "</select></div>" +
      '<div class="field"><label for="depAmt">Amount in €</label><input id="depAmt" type="number" min="100" step="100" value="2500"></div>' +
      '<div class="actions"><button class="btn btn-dark" id="depGo">Add funds</button><button class="btn btn-outline" id="depNo">Cancel</button></div>',
      function (modal) {
        modal.querySelector("#depNo").onclick = closeModal;
        modal.querySelector("#depGo").onclick = function () {
          var n = Number(modal.querySelector("#depAmt").value);
          var to = modal.querySelector("#depTo").value;
          if (!n || n < 100) return toast("Minimum amount €100");
          var acc = findAccount(to);
          setBalance(to, acc.balance + n);
          addTx({ accountId: to, title: "Deposit (simulated)", amount: n, category: "deposit" });
          saveBook();
          closeModal();
          toast("Deposited: " + eur(n));
          if (window.NNTrack) window.NNTrack.action("Deposit " + eur(n));
          render(current, extra);
        };
      }
    );
  }

  function transferFlow(presetFrom) {
    var opts = accounts().map(function (a) {
      return '<option value="' + esc(a.id) + '">' + esc((B.get(a.bankId) || {}).name) + " · " + esc(a.nickname) + "</option>";
    }).join("");
    openModal(
      "<h3>Transfer</h3><p>Between your linked accounts — booked instantly in the demo.</p>" +
      '<div class="field"><label for="trFrom">From</label><select id="trFrom">' + opts + "</select></div>" +
      '<div class="field"><label for="trTo">To</label><select id="trTo">' + opts + "</select></div>" +
      '<div class="field"><label for="trAmt">Amount in €</label><input id="trAmt" type="number" min="1" step="10" value="250"></div>' +
      '<div class="field"><label for="trNote">Payment reference</label><input id="trNote" value="Transfer own account"></div>' +
      '<div class="actions"><button class="btn btn-dark" id="trGo">Transfer now</button><button class="btn btn-outline" id="trNo">Cancel</button></div>',
      function (modal) {
        if (presetFrom) modal.querySelector("#trFrom").value = presetFrom;
        var toSel = modal.querySelector("#trTo");
        if (presetFrom && toSel.options.length > 1) {
          toSel.value = presetFrom === "wallet" ? (book.accounts[0] && book.accounts[0].id) || "wallet" : "wallet";
        }
        modal.querySelector("#trNo").onclick = closeModal;
        modal.querySelector("#trGo").onclick = function () {
          var from = modal.querySelector("#trFrom").value;
          var to = modal.querySelector("#trTo").value;
          var n = Number(modal.querySelector("#trAmt").value);
          var note = modal.querySelector("#trNote").value || "Transfer";
          if (from === to) return toast("Please choose two different accounts.");
          if (!n || n <= 0) return toast("Please enter an amount.");
          var src = findAccount(from);
          var dst = findAccount(to);
          if (n > src.balance) return toast("Not enough balance on the source account.");
          setBalance(from, src.balance - n);
          setBalance(to, dst.balance + n);
          addTx({ accountId: from, title: note + " → " + dst.nickname, amount: -n, category: "transfer" });
          addTx({ accountId: to, title: note + " ← " + src.nickname, amount: n, category: "transfer" });
          saveBook();
          closeModal();
          toast("Transferred: " + eur(n));
          if (window.NNTrack) window.NNTrack.action("Transfer " + eur(n));
          render(current, extra);
        };
      }
    );
  }

  function bankAdvisor(bankId) {
    var chosen = B.get(bankId);
    var name = chosen && chosen.name ? chosen.name : "this bank";
    if (window.NNTrack) window.NNTrack.action("Adviser: bank " + name);
    contactAdvisor("Connect bank", "To connect " + name + ", please contact your client adviser.");
  }

  function connectBankFlow(preselect) {
    if (window.NNTrack) window.NNTrack.action("Connect bank opened");
    if (!isDemoUser() && preselect) {
      bankAdvisor(preselect);
      return;
    }
    var step = preselect ? 2 : 1;
    var picked = preselect || null;
    var q = "";

    function paint(modal) {
      if (step === 1) {
        var list = B.connectable.filter(function (b) {
          return book.linkedBanks.indexOf(b.id) < 0 &&
            (!q || (b.name + " " + b.country + " " + b.kind).toLowerCase().indexOf(q.toLowerCase()) >= 0);
        });
        var intro = isDemoUser()
          ? "Simulated open banking — no live bank sign-in."
          : "Choose your bank. Your adviser will set up the connection.";
        modal.innerHTML = "<h3>Connect bank</h3><p>" + intro + "</p>" +
          '<div class="field"><input id="bkSearch" placeholder="Search banks — HSBC, Deutsche Bank, N26…" value="' + esc(q) + '"></div>' +
          '<div class="connect-grid">' + list.map(function (b) {
            return '<button class="bank-tile" type="button" data-pick="' + b.id + '">' + B.logo(b.id, 40) + "<b>" + b.name + "</b><i>" + b.country + "</i></button>";
          }).join("") + (list.length ? "" : '<p class="empty-inline">No matches, or already connected.</p>') + "</div>" +
          '<div class="actions"><button class="btn btn-outline" id="bkNo">Cancel</button></div>';
        modal.querySelector("#bkNo").onclick = closeModal;
        var search = modal.querySelector("#bkSearch");
        search.focus();
        search.oninput = function () { q = search.value; paint(modal); };
        modal.querySelectorAll("[data-pick]").forEach(function (btn) {
          btn.onclick = function () {
            picked = btn.getAttribute("data-pick");
            if (!isDemoUser()) {
              closeModal();
              bankAdvisor(picked);
              return;
            }
            step = 2;
            paint(modal);
          };
        });
        return;
      }

      var bank = B.get(picked);
      if (step === 2) {
        modal.innerHTML = "<h3>" + B.logo(bank.id, 36) + " Sign-in at " + bank.name + "</h3>" +
          "<p>Demo access. Any PIN works — no live bank login is performed.</p>" +
          '<div class="field"><label>Online banking user</label><input id="bkUser" value="' + esc(session.email) + '"></div>' +
          '<div class="field"><label>PIN / Password</label><div class="pw-wrap"><input id="bkPin" type="password" value=""><button type="button" class="pw-toggle" aria-label="Show password" aria-pressed="false"><svg class="pw-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><svg class="pw-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.7 10.7A3 3 0 0 0 13.3 13.3"/><path d="M9.9 5.1A11 11 0 0 1 12 5c6.4 0 10 7 10 7a18.5 18.5 0 0 1-2.2 3.2"/><path d="M6.1 6.1C3.8 7.9 2 12 2 12s3.6 7 10 7a10.8 10.8 0 0 0 4.4-.9"/></svg></button></div></div>' +
          '<div class="actions"><button class="btn btn-dark" id="bkNext">Load accounts</button><button class="btn btn-outline" id="bkBack">Back</button></div>';
        modal.querySelector("#bkBack").onclick = function () { step = 1; paint(modal); };
        if (window.NNAuth && window.NNAuth.bindPasswordToggles) window.NNAuth.bindPasswordToggles(modal);
        modal.querySelector("#bkNext").onclick = function () {
          var pin = modal.querySelector("#bkPin").value;
          if (!pin || pin.length < 4) return toast("PIN must be at least 4 characters.");
          step = 3;
          paint(modal);
        };
        return;
      }

      var templates = bank.templates || [];
      modal.innerHTML = "<h3>Import accounts</h3><p>" + bank.name + " found " + templates.length + " account" + (templates.length === 1 ? "" : "s") + ".</p>" +
        templates.map(function (t, i) {
          return '<label class="check-row"><input type="checkbox" data-type="' + t.type + '" checked>' +
            B.logo(bank.id, 28) + '<span><b>' + t.name + "</b><i>" + B.typeLabel(t.type) + (t.rate ? " · " + pct(t.rate) + " p.a." : "") + "</i></span></label>";
        }).join("") +
        '<div class="actions"><button class="btn btn-dark" id="bkGo">Connect</button><button class="btn btn-outline" id="bkBack">Back</button></div>';
      modal.querySelector("#bkBack").onclick = function () { step = 2; paint(modal); };
      modal.querySelector("#bkGo").onclick = function () {
        if (!isDemoUser()) {
          closeModal();
          bankAdvisor(bank.id);
          return;
        }
        var types = Array.prototype.slice.call(modal.querySelectorAll("input[data-type]:checked")).map(function (el) { return el.getAttribute("data-type"); });
        if (!types.length) return toast("Please select at least one account.");
        var created = B.makeAccounts(bank.id, types);
        book.accounts = book.accounts.concat(created);
        if (book.linkedBanks.indexOf(bank.id) < 0) book.linkedBanks.push(bank.id);
        created.forEach(function (a) {
          addTx({ accountId: a.id, title: "Account linked · " + bank.name, amount: 0, category: "other" });
        });
        saveBook();
        closeModal();
        toast(bank.name + " connected");
        if (window.NNTrack) window.NNTrack.action("Bank connected: " + bank.name);
        render("banks");
      };
    }

    openModal("", paint, true);
  }

  function unlinkBank(bankId) {
    var bank = B.get(bankId);
    openModal(
      "<h3>" + bank.name + " unlink</h3><p>All imported accounts from this bank will be removed from the platform. Activity stays in the history.</p>" +
      '<div class="actions"><button class="btn btn-danger" id="ulGo">Unlink bank</button><button class="btn btn-outline" id="ulNo">Cancel</button></div>',
      function (modal) {
        modal.querySelector("#ulNo").onclick = closeModal;
        modal.querySelector("#ulGo").onclick = function () {
          book.accounts = book.accounts.filter(function (a) { return a.bankId !== bankId; });
          book.linkedBanks = book.linkedBanks.filter(function (id) { return id !== bankId; });
          if (book.defaultAccountId && !findAccount(book.defaultAccountId)) book.defaultAccountId = "wallet";
          saveBook();
          closeModal();
          toast(bank.name + " disconnected");
          render("banks");
        };
      }
    );
  }

  function openProduct(prodId) {
    var p = product(prodId);
    var par = partner(p.partner);
    var rateLine = p.rate ? pct(p.rate) + " p.a." : "TER " + pct(p.ter);
    openModal(
      "<h3>" + p.name + "</h3><p>" + B.logo(par.id, 28) + " " + par.name + " · " + rateLine + "<br>Available on settlement: " + eur(book.cash) + "</p>" +
      '<div class="field"><label for="openAmt">Amount in €</label><input id="openAmt" type="number" min="' + p.min + '" step="100" value="' + Math.min(Math.max(p.min, 2500), Math.floor(book.cash) || p.min) + '"></div>' +
      '<div class="actions"><button class="btn btn-dark" id="openGo">Open</button><button class="btn btn-outline" id="openNo">Cancel</button></div>',
      function (modal) {
        modal.querySelector("#openNo").onclick = closeModal;
        modal.querySelector("#openGo").onclick = function () {
          var n = Number(modal.querySelector("#openAmt").value);
          if (!n || n < p.min) return toast("Minimum investment " + eur(p.min));
          if (n > book.cash) return toast("Not enough settlement cash. Please deposit or transfer.");
          book.cash -= n;
          book.holdings.push({ id: uid("h"), productId: p.id, amount: n, openedAt: new Date().toISOString() });
          addTx({ accountId: "wallet", title: "Investment " + p.name, amount: -n, category: "investment" });
          saveBook();
          closeModal();
          toast("Opened at " + par.name);
          render(current, extra);
        };
      }
    );
  }

  function productCard(p) {
    var par = partner(p.partner);
    var big = p.rate ? pct(p.rate) : pct(p.ter) + " TER";
    var meta = p.type === "etf"
      ? p.stocks + " % equities · " + p.bonds + " % bonds · " + p.region
      : (p.notice || (p.term + " month term")) + " · from " + eur(p.min);
    return '<article class="card prod">' +
      '<div class="prod-top">' + B.logo(par.id, 36) + pill(p.type) + "</div>" +
      "<h3>" + p.name + "</h3>" +
      '<div class="who">' + par.name + " · " + par.country + "</div>" +
      '<div class="big">' + big + "</div>" +
      '<p class="meta">' + meta + "</p>" +
      '<button class="btn btn-dark btn-sm" data-open="' + p.id + '">Invest</button>' +
      "</article>";
  }

  function productTable(list) {
    return '<div class="card table-wrap"><table class="list"><thead><tr><th>Product</th><th>Partner</th><th>Type</th><th>Rate / cost</th><th></th></tr></thead><tbody>' +
      list.map(function (p) {
        var par = partner(p.partner);
        var rate = p.rate ? pct(p.rate) + " p.a." : "TER " + pct(p.ter);
        return "<tr><td><b>" + p.name + "</b></td><td class='bank-cell'>" + B.logo(par.id, 24) + par.name + "</td><td>" + pill(p.type) + "</td><td class='rate'>" + rate + "</td><td><button class='btn btn-outline btn-sm' data-open='" + p.id + "'>Invest</button></td></tr>";
      }).join("") +
      "</tbody></table></div>";
  }

  function holdingsBlock() {
    if (!book.holdings.length) {
      return '<div class="card empty"><b>No holdings yet</b>Deposit and open overnight cash, term deposits or an ETF portfolio — all on one platform.</div>';
    }
    return '<div class="card table-wrap"><table class="list"><thead><tr><th>Investment</th><th>Partner</th><th>Amount</th><th>Return p.a.*</th></tr></thead><tbody>' +
      book.holdings.map(function (h) {
        var p = product(h.productId);
        var par = partner(p.partner);
        var r = p.rate || 3.2;
        return "<tr><td><b>" + p.name + "</b> " + pill(p.type) + "</td><td class='bank-cell'>" + B.logo(par.id, 24) + par.name + "</td><td class='amt'>" + eur(h.amount) + "</td><td class='rate'>" + eur(h.amount * r / 100) + "</td></tr>";
      }).join("") +
      "</tbody></table></div>";
  }

  function allocationBars() {
    var by = { savings: 0, cd: 0, etf: 0, cash: book.cash + bankCash() };
    book.holdings.forEach(function (h) {
      var p = product(h.productId);
      by[p.type] += h.amount;
    });
    var t = total() || 1;
    var rows = [
      ["Liquidity", by.cash, "var(--cyan)"],
      ["Overnight", by.savings, "var(--blue)"],
      ["Term deposits", by.cd, "var(--indigo)"],
      ["ETF", by.etf, "var(--pink)"]
    ];
    return '<div class="bars">' + rows.map(function (r) {
      var pctW = Math.round((r[1] / t) * 100);
      return '<div class="bar-row"><span>' + r[0] + '</span><div class="bar"><i style="width:' + pctW + "%;background:" + r[2] + '"></i></div><b>' + pctW + " %</b></div>";
    }).join("") + "</div>";
  }

  function bankStrip() {
    var banks = [{ id: "nnfinanz" }].concat(linkedBankObjs());
    return '<div class="bank-strip">' + banks.map(function (b) {
      return '<button class="bank-chip" type="button" data-go="banks" title="' + (B.get(b.id).name) + '">' + B.logo(b.id, 32) + "<span>" + B.get(b.id).name + "</span></button>";
    }).join("") +
      '<button class="bank-chip add" type="button" data-connect>+</button></div>';
  }

  function accountCard(a, compact) {
    var bank = B.get(a.bankId);
    var def = book.defaultAccountId === a.id ? '<span class="pill save">Default</span>' : "";
    return '<article class="card acct-card" data-acct="' + a.id + '">' +
      '<div class="acct-head">' + B.logo(a.bankId, 40) +
      '<div><b>' + (a.nickname || a.name) + "</b><i>" + bank.name + " · " + B.typeLabel(a.type) + "</i></div>" + def + "</div>" +
      '<div class="acct-bal">' + eur(a.balance) + "</div>" +
      '<div class="acct-iban">' + showIban(a) + (a.rate ? " · " + pct(a.rate) + " p.a." : "") + "</div>" +
      (compact ? "" : '<div class="acct-actions"><button class="btn btn-outline btn-sm" data-acct="' + a.id + '">Open</button></div>') +
      "</article>";
  }

  function txRows(list, limit) {
    var rows = (list || []).slice(0, limit || 50);
    if (!rows.length) return '<div class="card empty"><b>No activity</b>Deposits, transfers and holdings appear here.</div>';
    return '<div class="card tx-list">' + rows.map(function (t) {
      var acc = findAccount(t.accountId) || { nickname: "Account", bankId: "nnfinanz" };
      var pos = t.amount > 0;
      var zero = t.amount === 0;
      return '<div class="tx-row">' + B.logo(acc.bankId, 32) +
        '<div class="tx-main"><b>' + t.title + "</b><i>" + fmtDate(t.at) + " · " + (acc.nickname || acc.name) + " · " + catLabel(t.category) + "</i></div>" +
        '<b class="tx-amt ' + (zero ? "" : pos ? "pos" : "neg") + '">' + (zero ? "—" : (pos ? "+" : "") + eur(t.amount)) + "</b></div>";
    }).join("") + "</div>";
  }

  function viewOverview() {
    var topSave = PRODUCTS.filter(function (p) { return p.type === "savings"; }).sort(function (a, b) { return b.rate - a.rate; })[0];
    var topCd = PRODUCTS.filter(function (p) { return p.type === "cd"; }).sort(function (a, b) { return b.rate - a.rate; })[0];
    return bankStrip() +
      '<div class="hero-row">' +
      '<div class="card balance"><div class="lbl">Net assets</div><div class="amt">' + eur(total()) + "</div>" +
      '<p class="note">Banks ' + eur(bankCash()) + " · Settlement " + eur(book.cash) + " · investments " + eur(holdingValue()) + (holdingValue() ? ' · avg yield <b>' + pct(blendedRate()) + " p.a.</b>" : "") + "</p>" +
      '<div class="actions"><button class="btn btn-dark" id="doDeposit">Deposit</button><button class="btn btn-outline" id="doTransfer">Transfer</button><button class="btn btn-outline" data-go="market">Marketplace</button></div></div>' +
      '<div class="card"><div class="lbl" style="font-size:12px;color:var(--mut);font-weight:500;margin-bottom:10px">Allocation</div>' +
      allocationBars() +
      "</div></div>" +
      '<div class="stats">' +
      '<div class="card stat"><div class="lbl">Linked banks</div><div class="val">' + book.linkedBanks.length + '</div><div class="delta">' + book.accounts.length + " accounts active</div></div>" +
      '<div class="card stat"><div class="lbl">Best overnight</div><div class="val">' + pct(topSave.rate) + '</div><div class="delta">' + partner(topSave.partner).name + "</div></div>" +
      '<div class="card stat"><div class="lbl">KYC</div><div class="val">' + (isDemoUser() || (book.profile && book.profile.kyc === "verified") ? "OK" : "Open") + '</div><div class="delta">' + (isDemoUser() || (book.profile && book.profile.kyc === "verified") ? "Identity verified" : "Not yet completed") + "</div></div>" +
      "</div>" +
      '<div class="section-h"><div><h2>Your accounts</h2><p>Home banks and neobanks in one overview.</p></div><button class="btn btn-outline btn-sm" data-go="accounts">All accounts</button></div>' +
      '<div class="acct-grid">' + accounts().slice(0, 4).map(function (a) { return accountCard(a, true); }).join("") + "</div>" +
      '<div class="section-h"><div><h2>Recent activity</h2><p>Across all linked institutions.</p></div><button class="btn btn-outline btn-sm" data-go="activity">All activity</button></div>' +
      txRows(book.transactions, 6) +
      '<div class="section-h"><div><h2>Marketplace holdings</h2><p>Overnight cash, term deposits and ETFs via partners.</p></div></div>' +
      holdingsBlock() +
      '<p class="disclaimer">Demo platform: bank links, balances and activity are simulated. No live open-banking connection, no investment advice. Bank deposits are generally protected by law up to €100,000 per institution and customer.</p>';
  }

  function viewAccounts() {
    return '<div class="section-h"><div><h2>All accounts</h2><p>' + accounts().length + " accounts at " + (book.linkedBanks.length + 1) + " institutions.</p></div>" +
      '<div class="actions" style="margin:0"><button class="btn btn-dark btn-sm" id="doDeposit">Deposit</button><button class="btn btn-outline btn-sm" id="doTransfer">Transfer</button><button class="btn btn-outline btn-sm" data-connect>Connect bank</button></div></div>' +
      '<div class="acct-grid">' + accounts().map(function (a) { return accountCard(a, false); }).join("") + "</div>";
  }

  function viewAcct(id) {
    var a = findAccount(id);
    if (!a) return '<div class="card empty"><b>Account not found</b></div>';
    var bank = B.get(a.bankId);
    var txs = book.transactions.filter(function (t) { return t.accountId === a.id; });
    return '<button class="back-link" data-go="accounts">← All accounts</button>' +
      '<div class="hero-row">' +
      '<div class="card balance">' +
      '<div class="acct-head">' + B.logo(a.bankId, 48) + "<div><div class='lbl'>" + bank.name + "</div><div class='amt' style='font-size:28px'>" + (a.nickname || a.name) + "</div></div></div>" +
      '<p class="note" style="margin-top:16px">Balance <b style="color:var(--ink);font-size:22px">' + eur(a.balance) + "</b>" + (a.rate ? " · " + pct(a.rate) + " p.a." : "") + "</p>" +
      '<div class="iban-box"><span>' + showIban(a) + '</span><button class="btn btn-outline btn-sm" data-reveal="' + a.id + '">' + (book.revealed[a.id] ? "Hide" : "Show") + '</button><button class="btn btn-outline btn-sm" data-copy="' + a.id + '">Copy IBAN</button></div>' +
      '<div class="actions"><button class="btn btn-dark" data-transfer="' + a.id + '">Transfer</button>' +
      (a.locked ? "" : '<button class="btn btn-outline" data-default="' + a.id + '">Set as default</button><button class="btn btn-outline" data-rename="' + a.id + '">Rename</button>') +
      "</div></div>" +
      '<div class="card"><div class="lbl" style="font-size:12px;color:var(--mut);font-weight:500;margin-bottom:8px">Details</div>' +
      '<table class="list"><tbody>' +
      "<tr><td>Institution</td><td class='amt'>" + bank.name + "</td></tr>" +
      "<tr><td>Product</td><td class='amt'>" + a.name + "</td></tr>" +
      "<tr><td>Type</td><td class='amt'>" + B.typeLabel(a.type) + "</td></tr>" +
      "<tr><td>BIC</td><td class='amt'>" + a.bic + "</td></tr>" +
      "<tr><td>Currency</td><td class='amt'>" + a.currency + "</td></tr>" +
      "<tr><td>Status</td><td class='amt'><span class='status-dot'></span>On</td></tr>" +
      "<tr><td>Opened</td><td class='amt'>" + fmtDate(a.openedAt) + "</td></tr>" +
      "<tr><td>Last sync</td><td class='amt'>" + fmtDate(a.lastSync) + "</td></tr>" +
      "<tr><td>Protection</td><td class='amt'>" + bank.shield + "</td></tr>" +
      "</tbody></table></div></div>" +
      '<div class="section-h"><div><h2>Activity</h2><p>This account only.</p></div></div>' +
      txRows(txs, 40);
  }

  function viewBanks() {
    var q = bankQuery;
    var linked = linkedBankObjs();
    var available = B.connectable.filter(function (b) {
      return book.linkedBanks.indexOf(b.id) < 0 &&
        (!q || (b.name + " " + b.country + " " + b.kind).toLowerCase().indexOf(q.toLowerCase()) >= 0);
    });
    return '<div class="section-h"><div><h2>Linked banks</h2><p>Manage, sync or unlink accounts.</p></div><button class="btn btn-dark btn-sm" data-connect>Connect bank</button></div>' +
      (linked.length ? '<div class="bank-manage">' + linked.map(function (b) {
        var accs = book.accounts.filter(function (a) { return a.bankId === b.id; });
        var sum = accs.reduce(function (s, a) { return s + a.balance; }, 0);
        return '<article class="card bank-row">' + B.logo(b.id, 48) +
          '<div class="bank-copy"><b>' + b.name + "</b><i>" + b.kind + " · " + b.country + " · " + b.shield + "</i>" +
          '<div class="mini-accs">' + accs.map(function (a) { return '<button class="mini-acc" data-acct="' + a.id + '">' + a.nickname + " · " + eur(a.balance) + "</button>"; }).join("") + "</div></div>" +
          '<div class="bank-side"><div class="amt">' + eur(sum) + "</div>" +
          '<div class="acct-actions"><button class="btn btn-outline btn-sm" data-sync="' + b.id + '">Sync</button><button class="btn btn-outline btn-sm" data-unlink="' + b.id + '">Unlink</button></div></div></article>';
      }).join("") + "</div>" : '<div class="card empty"><b>No bank connected yet</b>Connect HSBC, Deutsche Bank, N26 and other institutions.</div>') +
      '<div class="section-h"><div><h2>Add institutions</h2><p>' +
      (isDemoUser()
        ? "HSBC, Deutsche Bank, Sparkasse, neobanks — demo logos and simulated accounts."
        : "Choose your bank. Your adviser will set up the connection.") +
      "</p></div></div>" +
      '<div class="field search-field"><input id="bankFilter" placeholder="Search banks…" value="' + esc(q) + '"></div>' +
      '<div class="connect-grid page">' + available.map(function (b) {
        return '<button class="bank-tile" type="button" data-pick="' + b.id + '">' + B.logo(b.id, 44) + "<b>" + b.name + "</b><i>" + b.kind + " · " + b.country + "</i></button>";
      }).join("") + "</div>";
  }

  function viewActivity() {
    return '<div class="section-h"><div><h2>Activity</h2><p>All movements across linked banks and the platform.</p></div></div>' +
      '<div class="filters" style="margin-bottom:16px"><button class="chip on" data-tx="all">All</button>' +
      accounts().map(function (a) { return '<button class="chip" data-tx="' + esc(a.id) + '">' + esc(a.nickname) + "</button>"; }).join("") +
      "</div>" +
      '<div id="txWrap">' + txRows(book.transactions, 80) + "</div>";
  }

  function viewAccount() {
    var p = book.profile;
    return '<div class="hero-row">' +
      '<div class="card"><div class="lbl">Profile</div>' +
      '<div class="profile-head">' + '<div class="avatar lg">' + esc(initials(session.name)) + "</div><div><b>" + esc(session.name) + "</b><i>" + esc(session.email) + '</i><span class="kyc">Identity verified</span></div></div>' +
      '<div class="field"><label>Address</label><input id="pfAddr" value="' + esc(p.address || "") + '"></div>' +
      '<div class="field"><label>Tax ID</label><input id="pfTax" value="' + esc(p.taxId || "") + '"></div>' +
      '<div class="field"><label>Phone</label><input id="pfPhone" value="' + esc(session.phone || "") + '"></div>' +
      '<div class="actions"><button class="btn btn-dark" id="pfSave">Save</button></div></div>' +
      '<div class="card"><div class="lbl">Security &amp; banks</div>' +
      '<table class="list" style="margin-top:8px"><tbody>' +
      "<tr><td>KYC status</td><td class='amt'>Verified</td></tr>" +
      "<tr><td>Two-factor</td><td class='amt'>" + (p.twoFa ? "On" : "Off") + "</td></tr>" +
      "<tr><td>Linked banks</td><td class='amt'>" + book.linkedBanks.length + "</td></tr>" +
      "<tr><td>Accounts</td><td class='amt'>" + accounts().length + "</td></tr>" +
      "<tr><td>Net assets</td><td class='amt'>" + eur(total()) + "</td></tr>" +
      "</tbody></table>" +
      '<label class="check-row tight"><input type="checkbox" id="pf2fa" ' + (p.twoFa ? "checked" : "") + ">Two-factor authentication (demo)</label>" +
      '<label class="check-row tight"><input type="checkbox" id="pfMail" ' + (p.notifyEmail ? "checked" : "") + ">Email on transfers</label>" +
      '<div class="actions" style="margin-top:14px"><button class="btn btn-outline" data-go="banks">Manage banks</button><button class="btn btn-outline" data-auth="logout">Log out</button></div></div></div>' +
      '<p class="disclaimer">Details are stored locally in this browser only. Zemp & Partner Asset Advisory AG is the demo operator — not live account-keeping at HSBC or other institutions.</p>';
  }

  function renameAccount(id) {
    var a = findAccount(id);
    if (!a || a.locked) return;
    openModal(
      "<h3>Rename account</h3>" +
      '<div class="field"><label>Display name</label><input id="rnName" value="' + esc(a.nickname) + '"></div>' +
      '<div class="actions"><button class="btn btn-dark" id="rnGo">Save</button><button class="btn btn-outline" id="rnNo">Cancel</button></div>',
      function (modal) {
        modal.querySelector("#rnNo").onclick = closeModal;
        modal.querySelector("#rnGo").onclick = function () {
          var name = modal.querySelector("#rnName").value.trim();
          if (!name) return toast("Please enter a name.");
          var real = book.accounts.find(function (x) { return x.id === id; });
          if (real) real.nickname = name;
          saveBook();
          closeModal();
          render("acct", id);
        };
      }
    );
  }

  function bindView() {
    var dep = document.getElementById("doDeposit");
    if (dep) dep.onclick = depositFlow;
    var tr = document.getElementById("doTransfer");
    if (tr) tr.onclick = function () { transferFlow(); };
    var pf = document.getElementById("pfSave");
    if (pf) pf.onclick = function () {
      book.profile.address = document.getElementById("pfAddr").value;
      book.profile.taxId = document.getElementById("pfTax").value;
      book.profile.twoFa = document.getElementById("pf2fa").checked;
      book.profile.notifyEmail = document.getElementById("pfMail").checked;
      saveBook();
      if (window.NNAuth && window.NNAuth.updateProfile) {
        window.NNAuth.updateProfile({
          phone: document.getElementById("pfPhone").value,
          address: book.profile.address,
          taxId: book.profile.taxId
        }).then(function () {
          session.phone = document.getElementById("pfPhone").value;
          toast("Profile saved");
        }).catch(function (err) { toast(err.message || "Profile saved locally"); });
      } else {
        toast("Profile saved");
      }
      if (window.NNTrack) window.NNTrack.action("Profile saved");
    };
    var filter = document.getElementById("bankFilter");
    if (filter) {
      filter.oninput = function () {
        bankQuery = filter.value;
        render("banks");
        var el = document.getElementById("bankFilter");
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      };
    }
    viewEl.querySelectorAll("[data-open]").forEach(function (btn) {
      btn.onclick = function () { openProduct(btn.getAttribute("data-open")); };
    });
    viewEl.querySelectorAll("[data-go]").forEach(function (btn) {
      btn.onclick = function () { render(btn.getAttribute("data-go")); };
    });
    viewEl.querySelectorAll("[data-filter]").forEach(function (btn) {
      btn.onclick = function () {
        var f = btn.getAttribute("data-filter");
        render("market", f === "cds" ? "cd" : f);
      };
    });
    viewEl.querySelectorAll("[data-connect]").forEach(function (btn) {
      btn.onclick = function () { connectBankFlow(); };
    });
    viewEl.querySelectorAll("[data-pick]").forEach(function (btn) {
      btn.onclick = function () { connectBankFlow(btn.getAttribute("data-pick")); };
    });
    viewEl.querySelectorAll("[data-unlink]").forEach(function (btn) {
      btn.onclick = function (e) { e.stopPropagation(); unlinkBank(btn.getAttribute("data-unlink")); };
    });
    viewEl.querySelectorAll("[data-sync]").forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var id = btn.getAttribute("data-sync");
        book.accounts.forEach(function (a) { if (a.bankId === id) a.lastSync = new Date().toISOString(); });
        saveBook();
        toast((B.get(id) || {}).name + " synced");
        render("banks");
      };
    });
    viewEl.querySelectorAll("[data-acct]").forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        render("acct", btn.getAttribute("data-acct"));
      };
    });
    viewEl.querySelectorAll("[data-reveal]").forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute("data-reveal");
        book.revealed[id] = !book.revealed[id];
        saveBook();
        render("acct", id);
      };
    });
    viewEl.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.onclick = function () {
        var acc = findAccount(btn.getAttribute("data-copy"));
        if (!acc) return;
        if (navigator.clipboard) navigator.clipboard.writeText(acc.iban.replace(/\s/g, ""));
        toast("IBAN copied");
      };
    });
    viewEl.querySelectorAll("[data-default]").forEach(function (btn) {
      btn.onclick = function () {
        book.defaultAccountId = btn.getAttribute("data-default");
        saveBook();
        toast("Default account set");
        render("acct", book.defaultAccountId);
      };
    });
    viewEl.querySelectorAll("[data-rename]").forEach(function (btn) {
      btn.onclick = function () { renameAccount(btn.getAttribute("data-rename")); };
    });
    viewEl.querySelectorAll("[data-transfer]").forEach(function (btn) {
      btn.onclick = function () { transferFlow(btn.getAttribute("data-transfer")); };
    });
    viewEl.querySelectorAll("[data-tx]").forEach(function (btn) {
      btn.onclick = function () {
        viewEl.querySelectorAll("[data-tx]").forEach(function (c) { c.classList.remove("on"); });
        btn.classList.add("on");
        var id = btn.getAttribute("data-tx");
        var list = id === "all" ? book.transactions : book.transactions.filter(function (t) { return t.accountId === id; });
        document.getElementById("txWrap").innerHTML = txRows(list, 80);
      };
    });
    viewEl.querySelectorAll("[data-auth='logout']").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        window.NNAuth.logout();
        window.location.href = "index.html";
      });
    });
  }

  function render(name, arg) {
    current = name;
    extra = arg || null;
    titleEl.textContent = name === "acct" && extra && findAccount(extra)
      ? (findAccount(extra).nickname || "Account")
      : (TITLES[name] || "Overview");
    document.querySelectorAll(".nav-item").forEach(function (btn) {
      if (!btn.getAttribute("data-view")) return;
      var v = btn.getAttribute("data-view");
      btn.classList.toggle("on", v === name || (name === "acct" && v === "accounts"));
    });
    if (name === "overview") viewEl.innerHTML = viewOverview();
    else if (name === "accounts") viewEl.innerHTML = viewAccounts();
    else if (name === "acct") viewEl.innerHTML = viewAcct(extra);
    else if (name === "banks") viewEl.innerHTML = viewBanks();
    else if (name === "activity") viewEl.innerHTML = viewActivity();
    else if (name === "market") viewEl.innerHTML = viewMarket(extra || "all");
    else if (name === "savings") viewEl.innerHTML = '<div class="section-h"><div><h2>High-yield overnight cash</h2><p>Available daily, compare rates, one platform.</p></div></div>' + productTable(PRODUCTS.filter(function (p) { return p.type === "savings"; }));
    else if (name === "cds") viewEl.innerHTML = '<div class="section-h"><div><h2>Term deposits / CDs</h2><p>Terms from 6 to 36 months at partner banks and credit unions.</p></div></div>' + productTable(PRODUCTS.filter(function (p) { return p.type === "cd"; }));
    else if (name === "etf") viewEl.innerHTML = '<div class="section-h"><div><h2>Simple ETF portfolios</h2><p>Selected regions only. Low cost, broadly diversified, without single-stock research.</p></div></div><div class="grid3">' + PRODUCTS.filter(function (p) { return p.type === "etf"; }).map(productCard).join("") + "</div>";
    else if (name === "account") viewEl.innerHTML = viewAccount();
    bindView();
    document.title = (titleEl.textContent || TITLES[name] || "Overview") + " — Zemp & Partner";
    if (window.NNTrack && window.NNTrack.view) window.NNTrack.view(TITLES[name] || name);
  }

  function viewMarket(filter) {
    var list = PRODUCTS.filter(function (p) { return !filter || filter === "all" || p.type === filter; });
    return '<div class="filters">' +
      '<button class="chip' + (!filter || filter === "all" ? " on" : "") + '" data-filter="all">All</button>' +
      '<button class="chip' + (filter === "savings" ? " on" : "") + '" data-filter="savings">Overnight</button>' +
      '<button class="chip' + (filter === "cd" ? " on" : "") + '" data-filter="cds">Term deposits</button>' +
      '<button class="chip' + (filter === "etf" ? " on" : "") + '" data-filter="etf">ETF</button>' +
      "</div>" +
      '<div class="grid3">' + list.map(productCard).join("") + "</div>" +
      '<p class="disclaimer">Compare and open without applying at every bank separately. ETF portfolios are not available in all regions.</p>';
  }

  document.querySelectorAll(".nav-item[data-view]").forEach(function (btn) {
    btn.addEventListener("click", function () { render(btn.getAttribute("data-view")); });
  });
  var qt = document.getElementById("quickTransfer");
  if (qt) qt.onclick = function () { transferFlow(); };

  try {
    render("overview");
  } catch (err) {
    if (viewEl) {
      viewEl.innerHTML = "<p>The marketplace could not open. Refresh the page.</p>";
    }
    if (window.console && console.error) console.error(err);
  }
})();
