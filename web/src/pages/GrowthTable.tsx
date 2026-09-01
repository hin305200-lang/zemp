import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { publicPath } from "../shared/lib/publicPath";

type Kind = "senior" | "covered" | "subordinated";
type Tab = "all" | Kind;
type SortKey = "ytm" | "coupon" | "term" | "income" | "issuer";
type View = "table" | "cards";

type Bond = {
  id: string;
  issuer: string;
  logo: string;
  name: string;
  kind: Kind;
  coupon: number;
  ytm: number;
  years: number;
  rating: string;
  seniority: string;
  frequency: "Semi-annual" | "Annual";
  minLot: number;
  terms: string;
};

const CASH_YIELD = 0.4;
const HORIZONS = [1, 2, 3, 5, 7, 10];
const AMOUNTS = [10_000, 25_000, 50_000, 100_000, 250_000];
const TERM_FILTERS = [
  { id: "any", label: "Any maturity" },
  { id: "short", label: "1–3 years" },
  { id: "mid", label: "3–5 years" },
  { id: "long", label: "5 years+" },
] as const;

const IG = new Set(["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-"]);

const BONDS: Bond[] = [
  {
    id: "wal-sr-26",
    issuer: "Western Alliance Bank",
    logo: "western-alliance-bank.png",
    name: "4.200% Senior Notes 2026",
    kind: "senior",
    coupon: 4.2,
    ytm: 4.2,
    years: 1,
    rating: "A-",
    seniority: "Senior unsecured",
    frequency: "Semi-annual",
    minLot: 5000,
    terms: "USD senior unsecured notes maturing in one year. Illustrative terms only.",
  },
  {
    id: "wal-sr-27",
    issuer: "Western Alliance Bank",
    logo: "western-alliance-bank.png",
    name: "4.125% Senior Notes 2027",
    kind: "senior",
    coupon: 4.125,
    ytm: 4.2,
    years: 2,
    rating: "A-",
    seniority: "Senior unsecured",
    frequency: "Semi-annual",
    minLot: 5000,
    terms: "USD senior unsecured notes. Callable only for tax reasons. Held in custody, not as a bank deposit.",
  },
  {
    id: "cnb-sr-28",
    issuer: "CNB Bank",
    logo: "cnbbank.png",
    name: "4.000% Senior Notes 2028",
    kind: "senior",
    coupon: 4.0,
    ytm: 4.17,
    years: 3,
    rating: "BBB+",
    seniority: "Senior unsecured",
    frequency: "Semi-annual",
    minLot: 5000,
    terms: "USD senior unsecured notes. Interest paid semi-annually. Price moves with yields and credit spreads.",
  },
  {
    id: "merrick-sr-29",
    issuer: "Merrick Bank",
    logo: "merrick-bank-logo.png",
    name: "4.250% Senior Notes 2029",
    kind: "senior",
    coupon: 4.25,
    ytm: 4.16,
    years: 4,
    rating: "BBB",
    seniority: "Senior unsecured",
    frequency: "Semi-annual",
    minLot: 5000,
    terms: "USD senior unsecured notes. Hold to maturity to realise the stated yield, subject to credit risk.",
  },
  {
    id: "nex-sr-28",
    issuer: "NexBank",
    logo: "nexbank-logo.png",
    name: "4.000% Senior Notes 2028",
    kind: "senior",
    coupon: 4.0,
    ytm: 4.15,
    years: 3,
    rating: "A-",
    seniority: "Senior unsecured",
    frequency: "Semi-annual",
    minLot: 5000,
    terms: "USD senior unsecured notes. Investment-grade issuer. Minimum lot USD 5,000.",
  },
  {
    id: "patriot-sr-27",
    issuer: "Patriot Bank N.A.",
    logo: "patriot-bank-n-a.png",
    name: "4.125% Senior Notes 2027",
    kind: "senior",
    coupon: 4.125,
    ytm: 4.15,
    years: 2,
    rating: "BBB+",
    seniority: "Senior unsecured",
    frequency: "Semi-annual",
    minLot: 5000,
    terms: "USD senior unsecured notes. Semi-annual coupons. Not a deposit and not FDIC-insured.",
  },
  {
    id: "wal-cv-30",
    issuer: "Western Alliance Bank",
    logo: "western-alliance-bank.png",
    name: "3.875% Covered Bond 2030",
    kind: "covered",
    coupon: 3.875,
    ytm: 4.05,
    years: 5,
    rating: "AA",
    seniority: "Covered / dual recourse",
    frequency: "Semi-annual",
    minLot: 10000,
    terms: "Covered bond secured by a cover pool. Dual recourse to the issuer and the pool. Illustrative terms only.",
  },
  {
    id: "centier-sr-28",
    issuer: "Centier Bank",
    logo: "centier-bank-logo.png",
    name: "3.875% Senior Notes 2028",
    kind: "senior",
    coupon: 3.875,
    ytm: 4.0,
    years: 3,
    rating: "BBB+",
    seniority: "Senior unsecured",
    frequency: "Semi-annual",
    minLot: 5000,
    terms: "USD senior unsecured notes. Suitable as a short corporate rung in a ladder.",
  },
  {
    id: "centier-cv-29",
    issuer: "Centier Bank",
    logo: "centier-bank-logo.png",
    name: "3.750% Covered Bond 2029",
    kind: "covered",
    coupon: 3.75,
    ytm: 3.9,
    years: 4,
    rating: "AA-",
    seniority: "Covered / dual recourse",
    frequency: "Annual",
    minLot: 10000,
    terms: "Covered bond with annual coupons. Cover-pool collateral in addition to the issuer’s promise.",
  },
  {
    id: "merrick-sub-31",
    issuer: "Merrick Bank",
    logo: "merrick-bank-logo.png",
    name: "5.000% Subordinated Notes 2031",
    kind: "subordinated",
    coupon: 5.0,
    ytm: 5.1,
    years: 6,
    rating: "BB+",
    seniority: "Tier 2 subordinated",
    frequency: "Semi-annual",
    minLot: 10000,
    terms: "Subordinated notes. Higher yield, junior ranking, not investment grade. Loss-absorbing in a resolution.",
  },
];

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "all", label: "All bonds" },
  { id: "senior", label: "Senior" },
  { id: "covered", label: "Covered" },
  { id: "subordinated", label: "Subordinated" },
];

const ISSUERS = [
  { issuer: "Western Alliance Bank", logo: "western-alliance-bank.png" },
  { issuer: "CNB Bank", logo: "cnbbank.png" },
  { issuer: "Merrick Bank", logo: "merrick-bank-logo.png" },
  { issuer: "Centier Bank", logo: "centier-bank-logo.png" },
  { issuer: "NexBank", logo: "nexbank-logo.png" },
  { issuer: "Patriot Bank N.A.", logo: "patriot-bank-n-a.png" },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const moneyWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function logoSrc(file: string): string {
  return publicPath(`assets/banks/${file}`);
}

function maturityLabel(years: number): string {
  return years === 1 ? "1 year" : `${years} years`;
}

function kindLabel(kind: Kind): string {
  if (kind === "covered") return "Covered";
  if (kind === "subordinated") return "Subordinated";
  return "Senior";
}

function yearsLabel(years: number): string {
  return years === 1 ? "1 year" : `${years} years`;
}

function bps(percent: number): number {
  return Math.round(percent * 100);
}

function yieldIncome(amount: number, percent: number, years: number): number {
  return Math.round((amount * bps(percent) * years) / 100) / 100;
}

function income(bond: Bond, amount: number, horizon: number, mode: "horizon" | "annual"): number {
  return yieldIncome(amount, bond.ytm, mode === "annual" ? 1 : horizon);
}

function BankMark({ file, name, decorative }: { file: string; name: string; decorative?: boolean }) {
  return <img className="mkt-logo" src={logoSrc(file)} alt={decorative ? "" : name} width={44} height={44} />;
}

function matchesTerm(bond: Bond, filter: (typeof TERM_FILTERS)[number]["id"]): boolean {
  if (filter === "any") return true;
  if (filter === "short") return bond.years <= 3;
  if (filter === "mid") return bond.years > 3 && bond.years <= 5;
  return bond.years > 5;
}

function nearestByYears(bonds: Bond[], target: number): Bond | null {
  if (bonds.length === 0) return null;
  return bonds.reduce((best, bond) => {
    const bestDelta = Math.abs(best.years - target);
    const nextDelta = Math.abs(bond.years - target);
    return nextDelta < bestDelta ? bond : best;
  });
}

export function GrowthTable() {
  const [tab, setTab] = useState<Tab>("all");
  const [amount, setAmount] = useState(50_000);
  const [horizon, setHorizon] = useState(5);
  const [termFilter, setTermFilter] = useState<(typeof TERM_FILTERS)[number]["id"]>("any");
  const [igOnly, setIgOnly] = useState(true);
  const [fitHorizon, setFitHorizon] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("ytm");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [earnMode, setEarnMode] = useState<"horizon" | "annual">("horizon");
  const [view, setView] = useState<View>("table");
  const [openTerms, setOpenTerms] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [showLadder, setShowLadder] = useState(false);

  const rows = useMemo(() => {
    const list = BONDS.filter((bond) => {
      if (tab !== "all" && bond.kind !== tab) return false;
      if (igOnly && !IG.has(bond.rating)) return false;
      if (fitHorizon && bond.years > horizon) return false;
      if (!matchesTerm(bond, termFilter)) return false;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const ea = income(a, amount, horizon, earnMode);
      const eb = income(b, amount, horizon, earnMode);
      if (sortKey === "ytm") return (a.ytm - b.ytm) * dir;
      if (sortKey === "coupon") return (a.coupon - b.coupon) * dir;
      if (sortKey === "term") return (a.years - b.years) * dir;
      if (sortKey === "income") return (ea - eb) * dir;
      return a.issuer.localeCompare(b.issuer) * dir;
    });
  }, [tab, igOnly, fitHorizon, horizon, termFilter, sortKey, sortDir, amount, earnMode]);

  const topYtm = rows.reduce((max, bond) => Math.max(max, bond.ytm), 0);
  const best = rows.find((bond) => bps(bond.ytm) === bps(topYtm));
  const holdYears = earnMode === "annual" ? 1 : horizon;
  const bestEarn = best ? income(best, amount, horizon, earnMode) : 0;
  const cashEarn = yieldIncome(amount, CASH_YIELD, holdYears);
  const extra = Math.max(0, bestEarn - cashEarn);
  const issuerCount = new Set(rows.map((bond) => bond.issuer)).size;

  const ladder = useMemo(() => {
    const pool = BONDS.filter((bond) => IG.has(bond.rating));
    const rungs = [2, 3, 5]
      .map((target) => nearestByYears(pool, target))
      .filter((bond): bond is Bond => bond != null)
      .filter((bond, index, list) => list.findIndex((item) => item.id === bond.id) === index);
    if (rungs.length < 2) return null;
    const slice = amount / rungs.length;
    const earn = rungs.reduce((sum, bond) => sum + yieldIncome(slice, bond.ytm, bond.years), 0);
    const blended = rungs.reduce((sum, bond) => sum + bond.ytm, 0) / rungs.length;
    return { rungs, slice, earn, blended };
  }, [amount]);

  function toggleSort(key: SortKey): void {
    if (sortKey === key) {
      setSortDir((value) => (value === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "issuer" ? "asc" : "desc");
  }

  function toggleCompare(id: string): void {
    setCompare((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  function setInvest(next: number): void {
    setAmount(Math.min(250_000, Math.max(1_000, next)));
  }

  const compared = compare
    .map((id) => BONDS.find((bond) => bond.id === id))
    .filter((bond): bond is Bond => Boolean(bond));

  return (
    <div className="mkt">
      <div className="mkt-partners" aria-label="Bond issuers">
        {ISSUERS.map((item) => (
          <figure key={item.issuer}>
            <BankMark file={item.logo} name={item.issuer} decorative />
            <figcaption>{item.issuer.replace(" N.A.", "")}</figcaption>
          </figure>
        ))}
      </div>

      <div className="mkt-planner">
        <div className="mkt-plan-controls">
          <div className="mkt-amount">
            <label htmlFor="mkt-deposit">Investment amount</label>
            <div className="mkt-amount-row">
              <input
                id="mkt-deposit"
                type="range"
                min={1000}
                max={250000}
                step={1000}
                value={amount}
                onChange={(event) => setInvest(Number(event.target.value))}
              />
              <input
                className="mkt-amount-input"
                type="text"
                inputMode="numeric"
                aria-label="Investment amount"
                value={amount.toLocaleString("en-US")}
                onChange={(event) => {
                  const digits = event.target.value.replace(/[^0-9]/g, "");
                  if (!digits) return;
                  setInvest(Number(digits));
                }}
              />
            </div>
            <div className="mkt-presets">
              {AMOUNTS.map((value) => (
                <button key={value} type="button" className={amount === value ? "on" : undefined} onClick={() => setInvest(value)}>
                  {moneyWhole.format(value)}
                </button>
              ))}
            </div>
          </div>
          <div className="mkt-horizon">
            <p>Investment horizon</p>
            <div className="mkt-chips" role="group" aria-label="Horizon">
              {HORIZONS.map((years) => (
                <button key={years} type="button" className={horizon === years ? "on" : undefined} onClick={() => setHorizon(years)}>
                  {years === 1 ? "1 yr" : `${years} yrs`}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mkt-stats">
          <div>
            <span>Best match yield</span>
            <strong>{best ? `${best.ytm.toFixed(2)}%` : "—"}</strong>
            <em>{best ? `${best.issuer} · ${kindLabel(best.kind)} · ${best.rating}` : "No bonds in this filter"}</em>
          </div>
          <div>
            <span>{`Projected return over ${yearsLabel(holdYears)}`}</span>
            <strong>{money.format(bestEarn)}</strong>
            <em>
              {best
                ? `${moneyWhole.format(amount)} × ${best.ytm.toFixed(2)}% × ${yearsLabel(holdYears)}  ·  +${money.format(extra)} vs ${CASH_YIELD.toFixed(2)}% cash`
                : `${moneyWhole.format(amount)} at the selected horizon`}
            </em>
          </div>
          <div>
            <span>Issuers in view</span>
            <strong>{issuerCount} {issuerCount === 1 ? "issuer" : "issuers"}</strong>
            <em>{rows.length} {rows.length === 1 ? "bond" : "bonds"} in the book</em>
          </div>
        </div>
      </div>

      <div className="mkt-toolbar">
        <div className="gtabs" role="tablist" aria-label="Bond types">
          {TABS.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "gtab on" : "gtab"}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mkt-view">
          <button type="button" className={view === "table" ? "on" : undefined} onClick={() => setView("table")}>
            Table
          </button>
          <button type="button" className={view === "cards" ? "on" : undefined} onClick={() => setView("cards")}>
            Cards
          </button>
        </div>
      </div>

      <div className="mkt-filters">
        <div className="mkt-chips" role="group" aria-label="Maturity">
          {TERM_FILTERS.map((item) => (
            <button key={item.id} type="button" className={termFilter === item.id ? "on" : undefined} onClick={() => setTermFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <label>
          <input type="checkbox" checked={igOnly} onChange={(event) => setIgOnly(event.target.checked)} />
          Investment grade only
        </label>
        <label>
          <input type="checkbox" checked={fitHorizon} onChange={(event) => setFitHorizon(event.target.checked)} />
          Mature within this horizon only
        </label>
        <label>
          <input
            type="checkbox"
            checked={earnMode === "annual"}
            onChange={(event) => setEarnMode(event.target.checked ? "annual" : "horizon")}
          />
          Show 1-year figure only
        </label>
        {ladder ? (
          <button type="button" className={showLadder ? "on" : undefined} onClick={() => setShowLadder((value) => !value)}>
            Bond ladder
          </button>
        ) : null}
      </div>

      {showLadder && ladder ? (
        <div className="mkt-ladder">
          <div>
            <p className="kicker">Ladder</p>
            <h3>Stagger {ladder.rungs.length} maturities</h3>
            <p>
              {moneyWhole.format(ladder.slice)} in each rung. Blended yield {ladder.blended.toFixed(2)}%. Capital returns as bonds mature, so you can reinvest at then-prevailing yields.
            </p>
          </div>
          <ol>
            {ladder.rungs.map((bond, index) => (
              <li key={bond.id}>
                <BankMark file={bond.logo} name={bond.issuer} />
                <div>
                  <b>Rung {index + 1} · {maturityLabel(bond.years)}</b>
                  <span>{bond.issuer} · YTM {bond.ytm.toFixed(2)}% · {bond.rating}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="mkt-empty">No bonds match these filters. Widen maturity or include high-yield names.</p>
      ) : view === "table" ? (
        <div className="atable-wrap mkt-table-wrap">
          <table className="mkt-table">
            <thead>
              <tr>
                <th>
                  <button type="button" onClick={() => toggleSort("issuer")}>
                    Issuer {sortKey === "issuer" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
                <th>Bond</th>
                <th>
                  <button type="button" onClick={() => toggleSort("ytm")}>
                    YTM {sortKey === "ytm" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort("coupon")}>
                    Coupon {sortKey === "coupon" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort("term")}>
                    Maturity {sortKey === "term" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort("income")}>
                    {earnMode === "annual" ? "Annual coupon" : "Projected return"} {sortKey === "income" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((bond) => (
                <BondRows
                  key={bond.id}
                  bond={bond}
                  amount={amount}
                  horizon={horizon}
                  earnMode={earnMode}
                  topYtm={topYtm}
                  best={best?.id === bond.id}
                  open={openTerms === bond.id}
                  checked={compare.includes(bond.id)}
                  compareFull={compare.length >= 3 && !compare.includes(bond.id)}
                  onTerms={() => setOpenTerms(openTerms === bond.id ? null : bond.id)}
                  onCompare={() => toggleCompare(bond.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mkt-cards">
          {rows.map((bond) => {
            const earn = income(bond, amount, horizon, earnMode);
            return (
              <article key={bond.id} className={best?.id === bond.id ? "mkt-card mkt-top" : "mkt-card"}>
                <header>
                  <BankMark file={bond.logo} name={bond.issuer} />
                  <div>
                    <b>{bond.issuer}</b>
                    <span>{bond.rating} · {kindLabel(bond.kind)}</span>
                  </div>
                </header>
                <p className="mkt-card-product">{bond.name}</p>
                <p className="mkt-apy">{bond.ytm.toFixed(2)}%</p>
                <p className="mkt-card-meta">
                  Coupon {bond.coupon.toFixed(3)}% · {maturityLabel(bond.years)}
                </p>
                <p className="mkt-earn">{money.format(earn)}</p>
                <footer>
                  <label className="mkt-check">
                    <input
                      type="checkbox"
                      checked={compare.includes(bond.id)}
                      disabled={compare.length >= 3 && !compare.includes(bond.id)}
                      onChange={() => toggleCompare(bond.id)}
                    />
                    Compare
                  </label>
                  <Link className="mkt-open" to="/signup">
                    Allocate
                  </Link>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      <p className="mkt-note">
        Illustrative USD bond yields as of 1 September 2026. YTM is yield to maturity, not a guaranteed return. Bond prices fall when yields rise. Coupons are credit- and market-risk dependent. Holdings sit in custody — they are not deposits and are not FDIC-insured. Not an offer. Past yields do not predict future results.
      </p>

      {compared.length > 0 ? (
        <div className="mkt-compare" role="region" aria-label="Compare bonds">
          <div className="mkt-compare-head">
            <p>Compare {compared.length} of 3</p>
            <button type="button" onClick={() => setCompare([])}>
              Clear
            </button>
          </div>
          <div className="mkt-matrix-wrap">
            <table className="mkt-matrix">
              <thead>
                <tr>
                  <th> </th>
                  {compared.map((bond) => (
                    <th key={bond.id}>
                      <BankMark file={bond.logo} name={bond.issuer} />
                      <b>{bond.issuer}</b>
                      <button type="button" onClick={() => toggleCompare(bond.id)} aria-label={`Remove ${bond.name}`}>
                        Remove
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Bond</th>
                  {compared.map((bond) => <td key={bond.id}>{bond.name}</td>)}
                </tr>
                <tr>
                  <th>YTM</th>
                  {compared.map((bond) => <td key={bond.id} className="mkt-apy">{bond.ytm.toFixed(2)}%</td>)}
                </tr>
                <tr>
                  <th>Coupon</th>
                  {compared.map((bond) => <td key={bond.id}>{bond.coupon.toFixed(3)}%</td>)}
                </tr>
                <tr>
                  <th>Maturity</th>
                  {compared.map((bond) => <td key={bond.id}>{maturityLabel(bond.years)}</td>)}
                </tr>
                <tr>
                  <th>Rating</th>
                  {compared.map((bond) => <td key={bond.id}>{bond.rating} · {bond.seniority}</td>)}
                </tr>
                <tr>
                  <th>Return</th>
                  {compared.map((bond) => <td key={bond.id}>{money.format(income(bond, amount, horizon, earnMode))}</td>)}
                </tr>
                <tr>
                  <th></th>
                  {compared.map((bond) => (
                    <td key={bond.id}>
                      <Link className="mkt-open" to="/signup">Allocate</Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BondRows({
  bond,
  amount,
  horizon,
  earnMode,
  topYtm,
  best,
  open,
  checked,
  compareFull,
  onTerms,
  onCompare,
}: {
  bond: Bond;
  amount: number;
  horizon: number;
  earnMode: "horizon" | "annual";
  topYtm: number;
  best: boolean;
  open: boolean;
  checked: boolean;
  compareFull: boolean;
  onTerms: () => void;
  onCompare: () => void;
}) {
  const earn = income(bond, amount, horizon, earnMode);
  const width = topYtm > 0 ? `${(bond.ytm / topYtm) * 100}%` : "0%";
  const past = bond.years > horizon;

  return (
    <>
      <tr className={best ? "mkt-top" : undefined}>
        <td>
          <div className="mkt-bank">
            <BankMark file={bond.logo} name={bond.issuer} />
            <div>
              <b>{bond.issuer}</b>
              <span>{bond.rating} · {bond.seniority}</span>
            </div>
          </div>
        </td>
        <td>
          <div className="mkt-product">
            {best ? <span className="mkt-best">Best yield for {horizon}-year horizon</span> : null}
            {past ? <span className="mkt-warn">Matures after horizon</span> : null}
            <b>{bond.name}</b>
            <button type="button" className="mkt-terms-btn" aria-expanded={open} onClick={onTerms}>
              Bond terms
            </button>
          </div>
        </td>
        <td>
          <div className="mkt-apy-cell">
            <span className="mkt-apy">{bond.ytm.toFixed(2)}%</span>
            <span className="mkt-bar" aria-hidden="true"><i style={{ width }} /></span>
          </div>
        </td>
        <td className="mkt-term">{bond.coupon.toFixed(3)}%</td>
        <td className="mkt-term">{maturityLabel(bond.years)}</td>
        <td className="mkt-earn">{money.format(earn)}</td>
        <td className="mkt-actions">
          <label className="mkt-check">
            <input type="checkbox" checked={checked} disabled={compareFull} onChange={onCompare} />
            Compare
          </label>
          <Link className="mkt-open" to="/signup">Allocate</Link>
        </td>
      </tr>
      {open ? (
        <tr className="mkt-detail">
          <td colSpan={7}>
            <dl className="mkt-spec">
              <div><dt>Seniority</dt><dd>{bond.seniority}</dd></div>
              <div><dt>Coupon</dt><dd>{bond.coupon.toFixed(3)}% · {bond.frequency}</dd></div>
              <div><dt>Rating</dt><dd>{bond.rating}</dd></div>
              <div><dt>Minimum</dt><dd>{money.format(bond.minLot)}</dd></div>
            </dl>
            <p>{bond.terms}</p>
          </td>
        </tr>
      ) : null}
    </>
  );
}
