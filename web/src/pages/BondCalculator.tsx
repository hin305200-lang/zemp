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
  const monthly = months ? profit / months : 0;
  const gainShare = end > 0 ? (profit / end) * 100 : 0;

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
          <p className="bc-results-kicker">Estimated returns</p>
          <div className="bc-end">
            <span>End value</span>
            <strong>{moneyDec.format(end)}</strong>
          </div>
          <div className="bc-gainline">
            <b className="bc-pos">+{moneyDec.format(profit)}</b>
            <span>{pct.toFixed(2)}% total return</span>
          </div>
          <div className="bc-composition">
            <div className="bc-stack" aria-hidden="true">
              <i className="bc-stack-prin" style={{ width: `${Math.max(100 - gainShare, 8)}%` }} />
              <i className="bc-stack-gain" style={{ width: `${Math.min(Math.max(gainShare, 4), 92)}%` }} />
            </div>
            <div className="bc-legend">
              <span>
                <i className="bc-dot prin" /> Principal
              </span>
              <span>
                <i className="bc-dot gain" /> Return
              </span>
            </div>
          </div>
          <div className="bc-chips">
            <div>
              <span>Principal</span>
              <b>{money.format(amount)}</b>
            </div>
            <div>
              <span>Term</span>
              <b>{months} mo</b>
            </div>
            <div>
              <span>Annual rate</span>
              <b>{rate.toFixed(1)}%</b>
            </div>
            <div>
              <span>Monthly income</span>
              <b>{moneyDec.format(monthly)}</b>
            </div>
          </div>
          <Link className="bc-cta" to="/signup">
            Start this contract
          </Link>
        </div>
      </div>
      <p className="bc-note">{cfg.note}</p>
    </div>
  );
}
