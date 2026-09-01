(function () {
  "use strict";

  function mark(bg, inner) {
    return '<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" fill="' + bg + '"/>' + inner + "</svg>";
  }

  var LOGOS = {
    nnfinanz: mark("#0b0b10", '<rect x="10" y="10" width="16" height="16" rx="5" fill="url(#lgm)"/><rect x="22" y="22" width="16" height="16" rx="5" fill="#22b8d4" opacity=".7"/>'),
    hsbc: mark("#DB0011", '<path fill="#fff" d="M9 11h30L24 24 9 11zm0 26h30L24 24 9 37z"/>'),
    deutsche: mark("#0018A8", '<path d="M15 33L33 15" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'),
    commerzbank: mark("#FFD200", '<path fill="#111" d="M18 14h4v20h-4zm8 0l10 10-10 10V14z"/>'),
    ing: mark("#FF6200", '<text x="24" y="30" text-anchor="middle" fill="#fff" font-size="15" font-weight="800" font-family="Inter,Arial,sans-serif">ING</text>'),
    n26: mark("#191919", '<text x="24" y="31" text-anchor="middle" fill="#fff" font-size="14" font-weight="800" font-family="Inter,Arial,sans-serif">N26</text>'),
    dkb: mark("#00ADEF", '<text x="24" y="31" text-anchor="middle" fill="#fff" font-size="13" font-weight="800" font-family="Inter,Arial,sans-serif">DKB</text>'),
    sparkasse: mark("#E30613", '<path fill="#fff" d="M16 14c8 0 14 4 14 10 0 4-3 7-8 8l7 6h-7l-8-7c6 0 9-2 9-5s-3-5-8-5V14z"/>'),
    santander: mark("#EC0000", '<path fill="#fff" d="M24 10c6 6 10 10 10 16 0 7-4.5 12-10 12S14 33 14 26c0-6 4-10 10-16zm0 10c-3 3-5 5-5 8 0 3 2 6 5 6s5-3 5-6c0-3-2-5-5-8z"/>'),
    barclays: mark("#00AEEF", '<path fill="#fff" d="M24 9l3 8 8 .4-6.2 5.3 2.2 8L24 26.2 16.9 31l2.3-8L13 17.4l8-.4z"/>'),
    bnp: mark("#00915A", '<text x="24" y="23" text-anchor="middle" fill="#fff" font-size="9" font-weight="800" font-family="Inter,Arial,sans-serif">BNP</text><text x="24" y="35" text-anchor="middle" fill="#fff" font-size="7" font-weight="700" font-family="Inter,Arial,sans-serif">PARIBAS</text>'),
    revolut: mark("#191919", '<text x="24" y="31" text-anchor="middle" fill="#fff" font-size="11" font-weight="800" font-family="Inter,Arial,sans-serif">R</text>'),
    traderepublic: mark("#0B0B0F", '<rect x="14" y="14" width="20" height="20" rx="4" fill="#fff"/><rect x="18" y="22" width="12" height="4" fill="#0B0B0F"/>'),
    consors: mark("#F39200", '<text x="24" y="31" text-anchor="middle" fill="#fff" font-size="11" font-weight="800" font-family="Inter,Arial,sans-serif">CB</text>'),
    hvb: mark("#E2001A", '<text x="24" y="23" text-anchor="middle" fill="#fff" font-size="10" font-weight="800" font-family="Inter,Arial,sans-serif">HVB</text><text x="24" y="35" text-anchor="middle" fill="#fff" font-size="6.5" font-weight="700" font-family="Inter,Arial,sans-serif">UniCredit</text>'),
    comdirect: mark("#FFD100", '<text x="24" y="30" text-anchor="middle" fill="#111" font-size="10" font-weight="800" font-family="Inter,Arial,sans-serif">comdirect</text>'),
    postbank: mark("#2541B2", '<text x="24" y="31" text-anchor="middle" fill="#fff" font-size="9" font-weight="800" font-family="Inter,Arial,sans-serif">Postbank</text>'),
    c24: mark("#0050FF", '<text x="24" y="31" text-anchor="middle" fill="#fff" font-size="14" font-weight="800" font-family="Inter,Arial,sans-serif">C24</text>'),
    bunq: mark("#19C37D", '<text x="24" y="31" text-anchor="middle" fill="#fff" font-size="13" font-weight="800" font-family="Inter,Arial,sans-serif">bunq</text>'),
    quenzia: mark("#4f6bf5", '<circle cx="24" cy="24" r="9" fill="#fff"/><circle cx="24" cy="24" r="4" fill="#4f6bf5"/>'),
    nordvia: mark("#0f766e", '<path fill="#fff" d="M10 30l14-16 14 16H10z"/>'),
    hallovar: mark("#7c3aed", '<rect x="12" y="12" width="24" height="24" rx="6" fill="#fff"/><rect x="18" y="18" width="12" height="12" rx="3" fill="#7c3aed"/>'),
    tresmo: mark("#0369a7", '<path fill="#fff" d="M24 10l12 28H12z"/>'),
    kyndal: mark("#0b0b10", '<circle cx="24" cy="24" r="10" stroke="#22b8d4" stroke-width="3" fill="none"/><circle cx="24" cy="24" r="4" fill="#22b8d4"/>'),
    lumenix: mark("#b45309", '<rect x="11" y="20" width="26" height="8" rx="2" fill="#fff"/>'),
    bravura: mark("#be185d", '<circle cx="18" cy="24" r="7" fill="#fff"/><circle cx="30" cy="24" r="7" fill="#fff" opacity=".7"/>')
  };

  var BANKS = [
    { id: "nnfinanz", name: "Zemp & Partner", short: "ZP", country: "Switzerland", kind: "Platform", bic: "ZEMPCHZZXXX", color: "#0b0b10", shield: "Settlement account", offers: ["Settlement"], connectable: false },
    { id: "hsbc", name: "HSBC", short: "HSBC", country: "Germany / UK", kind: "Bank", bic: "TUBDDEDDXXX", color: "#DB0011", shield: "EdB up to €100,000", offers: ["Current", "Overnight", "Brokerage"], connectable: true,
      templates: [
        { type: "checking", name: "HSBC Premier Current", rate: 0, seed: 12450.2 },
        { type: "savings", name: "HSBC Premier Savings", rate: 2.15, seed: 8200 }
      ] },
    { id: "deutsche", name: "Deutsche Bank", short: "DB", country: "Germany", kind: "Bank", bic: "DEUTDEFFXXX", color: "#0018A8", shield: "EdB up to €100,000", offers: ["Current", "Overnight"], connectable: true,
      templates: [
        { type: "checking", name: "Deutsche Bank Current", rate: 0, seed: 3280.4 },
        { type: "savings", name: "DB Best Rate", rate: 1.8, seed: 5000 }
      ] },
    { id: "commerzbank", name: "Commerzbank", short: "CBK", country: "Germany", kind: "Bank", bic: "COBADEFFXXX", color: "#FFD200", shield: "EdB up to €100,000", offers: ["Current", "Overnight"], connectable: true,
      templates: [
        { type: "checking", name: "Commerzbank Current", rate: 0, seed: 2140.75 },
        { type: "savings", name: "Commerzbank Extra", rate: 1.9, seed: 6000 }
      ] },
    { id: "ing", name: "ING", short: "ING", country: "Germany", kind: "Direct bank", bic: "INGDDEFFXXX", color: "#FF6200", shield: "EdB up to €100,000", offers: ["Current", "Overnight", "Brokerage"], connectable: true,
      templates: [
        { type: "checking", name: "ING Current", rate: 0, seed: 1890.12 },
        { type: "savings", name: "ING Extra-Account", rate: 2.0, seed: 7400 }
      ] },
    { id: "n26", name: "N26", short: "N26", country: "Germany", kind: "Neobank", bic: "NTSBDEB1XXX", color: "#191919", shield: "EdB up to €100,000", offers: ["Current", "Spaces"], connectable: true,
      templates: [
        { type: "checking", name: "N26 Standard", rate: 0, seed: 1105.22 },
        { type: "savings", name: "N26 Space · Reserve", rate: 1.5, seed: 900 }
      ] },
    { id: "dkb", name: "DKB", short: "DKB", country: "Germany", kind: "Direct bank", bic: "BYLADEM1001", color: "#00ADEF", shield: "EdB up to €100,000", offers: ["Current", "Visa"], connectable: true,
      templates: [
        { type: "checking", name: "DKB Current", rate: 0, seed: 2560 },
        { type: "card", name: "DKB Visa Debit", rate: 0, seed: 890.12 }
      ] },
    { id: "sparkasse", name: "Sparkasse", short: "SK", country: "Germany", kind: "Savings bank", bic: "BELADEBEXXX", color: "#E30613", shield: "Institutional protection", offers: ["Current", "Overnight"], connectable: true,
      templates: [
        { type: "checking", name: "Sparkasse Current", rate: 0, seed: 4320.9 }
      ] },
    { id: "santander", name: "Santander", short: "SAN", country: "Germany / ES", kind: "Bank", bic: "SCFBDE33XXX", color: "#EC0000", shield: "EdB up to €100,000", offers: ["Current", "Term deposits"], connectable: true,
      templates: [
        { type: "checking", name: "Santander Current", rate: 0, seed: 980.4 },
        { type: "cd", name: "Santander 12-month term deposit", rate: 2.8, seed: 10000 }
      ] },
    { id: "barclays", name: "Barclays", short: "BARC", country: "UK / DE", kind: "Bank", bic: "BARCDEFFXXX", color: "#00AEEF", shield: "FSCS / EdB", offers: ["Current", "Savings"], connectable: true,
      templates: [
        { type: "checking", name: "Barclays Current", rate: 0, seed: 1540 },
        { type: "savings", name: "Barclays Rainy Day", rate: 2.25, seed: 3200 }
      ] },
    { id: "bnp", name: "BNP Paribas", short: "BNP", country: "France / DE", kind: "Bank", bic: "BNPADEFFXXX", color: "#00915A", shield: "FGDR / EdB", offers: ["Current", "Brokerage"], connectable: true,
      templates: [
        { type: "checking", name: "BNP Paribas Current", rate: 0, seed: 2760.5 }
      ] },
    { id: "revolut", name: "Revolut", short: "REV", country: "EEA", kind: "Neobank", bic: "REVOGB21XXX", color: "#191919", shield: "Safeguarding / DGS", offers: ["Current", "Vaults"], connectable: true,
      templates: [
        { type: "checking", name: "Revolut EUR", rate: 0, seed: 640.18 },
        { type: "savings", name: "Revolut Vault", rate: 2.5, seed: 1500 }
      ] },
    { id: "traderepublic", name: "Trade Republic", short: "TR", country: "Germany", kind: "Broker", bic: "TRBKDEBBXXX", color: "#0B0B0F", shield: "EdB / segregated assets", offers: ["Settlement", "Broker"], connectable: true,
      templates: [
        { type: "broker", name: "Trade Republic Cash", rate: 2.0, seed: 1180 }
      ] },
    { id: "consors", name: "Consorsbank", short: "CNS", country: "Germany", kind: "Direct bank", bic: "CSDBDE71XXX", color: "#F39200", shield: "EdB up to €100,000", offers: ["Current", "Brokerage"], connectable: true,
      templates: [
        { type: "checking", name: "Consorsbank Current", rate: 0, seed: 720 },
        { type: "broker", name: "Consorsbank Brokerage", rate: 0, seed: 4400 }
      ] },
    { id: "hvb", name: "HypoVereinsbank", short: "HVB", country: "Germany", kind: "Bank", bic: "HYVEDEMMXXX", color: "#E2001A", shield: "EdB up to €100,000", offers: ["Current", "Wealth"], connectable: true,
      templates: [
        { type: "checking", name: "HVB Current", rate: 0, seed: 3650 }
      ] },
    { id: "comdirect", name: "comdirect", short: "CD", country: "Germany", kind: "Direct bank", bic: "COBADEHDXXX", color: "#FFD100", shield: "EdB up to €100,000", offers: ["Current", "Brokerage"], connectable: true,
      templates: [
        { type: "checking", name: "comdirect Current", rate: 0, seed: 1330.6 },
        { type: "broker", name: "comdirect Brokerage", rate: 0, seed: 8900 }
      ] },
    { id: "postbank", name: "Postbank", short: "PB", country: "Germany", kind: "Bank", bic: "PBNKDEFFXXX", color: "#2541B2", shield: "EdB up to €100,000", offers: ["Current"], connectable: true,
      templates: [
        { type: "checking", name: "Postbank Current", rate: 0, seed: 540.2 }
      ] },
    { id: "c24", name: "C24 Bank", short: "C24", country: "Germany", kind: "Neobank", bic: "C24BDEFFXXX", color: "#0050FF", shield: "EdB up to €100,000", offers: ["Current", "Overnight"], connectable: true,
      templates: [
        { type: "checking", name: "C24 Current", rate: 0, seed: 410 },
        { type: "savings", name: "C24 Overnight", rate: 2.3, seed: 2500 }
      ] },
    { id: "bunq", name: "bunq", short: "bunq", country: "Netherlands", kind: "Neobank", bic: "BUNQNL2AXXX", color: "#19C37D", shield: "DGS up to €100,000", offers: ["Current", "Savings"], connectable: true,
      templates: [
        { type: "checking", name: "bunq Easy Bank", rate: 0, seed: 880 }
      ] },
    { id: "quenzia", name: "Quenzia Direct", short: "Q", country: "Germany", kind: "Marketplace-Partner", bic: "QUENDEBBXXX", color: "#4f6bf5", shield: "EdB up to €100,000", offers: ["Overnight", "Term deposits"], connectable: false },
    { id: "nordvia", name: "Nordvia Bank", short: "NV", country: "Sweden", kind: "Marketplace-Partner", bic: "NVBASESSXXX", color: "#0f766e", shield: "Deposit protection SE", offers: ["Overnight"], connectable: false },
    { id: "hallovar", name: "Hallovar Credit union", short: "HK", country: "Austria", kind: "Marketplace-Partner", bic: "HALLATWWXXX", color: "#7c3aed", shield: "Deposit protection AT", offers: ["Overnight", "Term deposits"], connectable: false },
    { id: "tresmo", name: "Tresmo Bank", short: "TR", country: "Netherlands", kind: "Marketplace-Partner", bic: "TRESNL2AXXX", color: "#0369a7", shield: "DGS up to €100,000", offers: ["Overnight", "Term deposits"], connectable: false },
    { id: "kyndal", name: "Kyndal Wealth", short: "KY", country: "Germany", kind: "Marketplace-Partner", bic: "KYNDDEFFXXX", color: "#0b0b10", shield: "Segregated assets / ETF", offers: ["ETF"], connectable: false },
    { id: "lumenix", name: "Lumenix", short: "LX", country: "Italy", kind: "Marketplace-Partner", bic: "LUMIITMMXXX", color: "#b45309", shield: "FITD up to €100,000", offers: ["Term deposits"], connectable: false },
    { id: "bravura", name: "Bravura Credit Union", short: "BR", country: "France", kind: "Marketplace-Partner", bic: "BRAVFRPPXXX", color: "#be185d", shield: "FGDR up to €100,000", offers: ["Term deposits"], connectable: false }
  ];

  function bank(id) {
    return BANKS.find(function (b) { return b.id === id; });
  }

  function logo(id, size) {
    var b = bank(id) || { color: "#111", name: "?" };
    var svg = LOGOS[id] || mark(b.color || "#333", '<text x="24" y="31" text-anchor="middle" fill="#fff" font-size="16" font-weight="800" font-family="Inter,Arial,sans-serif">' + (b.short || "?").slice(0, 2) + "</text>");
    var px = size || 40;
    return '<span class="bank-logo" style="width:' + px + "px;height:" + px + 'px" title="' + b.name + '">' + svg + "</span>";
  }

  function typeLabel(t) {
    return ({ checking: "Current", savings: "Overnight", cd: "Term deposits", card: "Card", broker: "Brokerage", wallet: "Settlement", etf: "ETF" })[t] || t;
  }

  function fakeIban(bankId, slot) {
    var map = {
      hsbc: "DE89 5001 0517",
      deutsche: "DE02 1007 0000",
      commerzbank: "DE12 1208 0000",
      ing: "DE76 5001 0517",
      n26: "DE16 1001 1001",
      dkb: "DE53 1203 0000",
      sparkasse: "DE91 1005 0000",
      santander: "DE44 5003 3300",
      barclays: "DE61 5033 0400",
      bnp: "DE18 5121 0800",
      revolut: "LT12 3250 0000",
      traderepublic: "DE88 5123 0500",
      consors: "DE55 7603 0080",
      hvb: "DE07 7002 0270",
      comdirect: "DE14 2004 1133",
      postbank: "DE62 1001 0010",
      c24: "DE31 7001 1110",
      bunq: "NL91 BUNQ 0000",
      nnfinanz: "CH93 0076 2011"
    };
    var prefix = map[bankId] || "DE00 0000 0000";
    var n = String(10000000 + (slot || 1) * 137).slice(0, 8);
    return prefix + " " + n.slice(0, 4) + " " + n.slice(4);
  }

  function makeAccounts(bankId, selectedTypes) {
    var b = bank(bankId);
    if (!b || !b.templates) return [];
    return b.templates.filter(function (t) {
      return !selectedTypes || selectedTypes.indexOf(t.type) >= 0;
    }).map(function (t, i) {
      return {
        id: "acc-" + bankId + "-" + t.type + "-" + Date.now() + "-" + i,
        bankId: bankId,
        type: t.type,
        name: t.name,
        nickname: t.name,
        iban: fakeIban(bankId, i + 1),
        bic: b.bic,
        currency: "EUR",
        balance: t.seed || 0,
        rate: t.rate || 0,
        status: "active",
        openedAt: new Date().toISOString(),
        lastSync: new Date().toISOString()
      };
    });
  }

  window.NNBanks = {
    list: BANKS,
    connectable: BANKS.filter(function (b) { return b.connectable; }),
    get: bank,
    logo: logo,
    typeLabel: typeLabel,
    fakeIban: fakeIban,
    makeAccounts: makeAccounts
  };
})();
