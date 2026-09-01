import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Asset = "bonds" | "gold";

const CONFIG = {
  bonds: {
    minInv: 1000,
    maxInv: 1_000_000,
    stepInv: 1000,
    defaultInv: 8000,
    minTerm: 1,
    maxTerm: 60,
    stepTerm: 1,
    defaultTerm: 12,
    minRate: 4,
    maxRate: 10,
    stepRate: 0.05,
    defaultRate: 8.3,
    note: "*Based on historical 8.3% annual bond returns. Actual returns may vary.",
  },
  gold: {
    minInv: 2000,
    maxInv: 1_000_000,
    stepInv: 1000,
    defaultInv: 15_000,
    minTerm: 6,
    maxTerm: 120,
    stepTerm: 6,
    defaultTerm: 24,
    minRate: 6,
    maxRate: 15,
    stepRate: 0.1,
    defaultRate: 10.5,
    note: "*Based on historical gold market projections. Returns are not guaranteed.",
  },
} as const;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const moneyDec = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function BondCalculator() {
  const [asset, setAsset] = useState<Asset>("bonds");
  const cfg = CONFIG[asset];
  const [amount, setAmount] = useState<number>(cfg.defaultInv);
  const [months, setMonths] = useState<number>(cfg.defaultTerm);
  const [rate, setRate] = useState<number>(cfg.defaultRate);

  function switchTab(next: Asset): void {
    const nextCfg = CONFIG[next];
    setAsset(next);
    setAmount(nextCfg.defaultInv);
    setMonths(nextCfg.defaultTerm);
    setRate(nextCfg.defaultRate);
  }

  const years = months / 12;
  const profit = useMemo(() => amount * (rate / 100) * years, [amount, rate, years]);
  const end = amount + profit;
  const pct = amount ? (profit / amount) * 100 : 0;

  return (
    <div className="bc-shell">
      <div className="bc-tabs-wrap">
        <div className="bc-tabs" role="tablist" aria-label="Asset class">
          <button type="button" className={asset === "bonds" ? "bc-tab on" : "bc-tab"} onClick={() => switchTab("bonds")}>
            Bonds
          </button>
          <button type="button" className={asset === "gold" ? "bc-tab on" : "bc-tab"} onClick={() => switchTab("gold")}>
            Gold
          </button>
        </div>
      </div>

      <div className="bc-grid">
        <div className="bc-panel">
          <div className="bc-slider">
            <div className="bc-label">Investment Amount</div>
            <div className="bc-value">{money.format(amount)}</div>
            <input
              type="range"
              className="bc-range"
              min={cfg.minInv}
              max={cfg.maxInv}
              step={cfg.stepInv}
              value={amount}
              aria-label="Investment amount"
              onChange={(event) => setAmount(Number(event.target.value))}
            />
          </div>
          <div className="bc-slider">
            <div className="bc-label">Contract Term</div>
            <div className="bc-value">{months} months</div>
            <input
              type="range"
              className="bc-range"
              min={cfg.minTerm}
              max={cfg.maxTerm}
              step={cfg.stepTerm}
              value={months}
              aria-label="Contract term"
              onChange={(event) => setMonths(Number(event.target.value))}
            />
          </div>
          <div className="bc-slider bc-slider-last">
            <div className="bc-label">Estimated Annual Return</div>
            <div className="bc-value">{rate.toFixed(1)} %</div>
            <input
              type="range"
              className="bc-range"
              min={cfg.minRate}
              max={cfg.maxRate}
              step={cfg.stepRate}
              value={rate}
              aria-label="Estimated annual return"
              onChange={(event) => setRate(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="bc-results">
          <div>
            <h3>Estimated Returns</h3>
            <div className="bc-row">
              <span>Initial Investment</span>
              <b>{money.format(amount)}</b>
            </div>
            <div className="bc-row">
              <span>Contract Term</span>
              <b>{months} months</b>
            </div>
            <div className="bc-row bc-row-end">
              <span>Estimated End Value</span>
              <b className="bc-hi">{moneyDec.format(end)}</b>
            </div>
            <div className="bc-row bc-row-gain">
              <span>Total Return</span>
              <b className="bc-pos">
                +{moneyDec.format(profit)} ({pct.toFixed(2)}%)
              </b>
            </div>
          </div>
          <Link className="bc-cta" to="/signup">
            Get started with this contract →
          </Link>
        </div>
      </div>
      <p className="bc-note">{cfg.note}</p>
    </div>
  );
}
