import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useChromeMotion } from "../motion/useChromeMotion";
import { safeUrl } from "../shared/lib/safeUrl";
import { publicPath } from "../shared/lib/publicPath";
import { BondCalculator } from "./BondCalculator";
import { SiteNav } from "./SiteNav";

const FAQS = [
  {
    q: "How can I generate reliable income?",
    a: "Fixed-income bonds pay a stated coupon and repay principal at maturity, subject to the issuer’s credit. The calculator above is illustrative — it is not a forecast or an offer.",
  },
  {
    q: "What’s the risk profile of these investments?",
    a: "Bonds are securities, not deposits. You take issuer credit risk and market risk: if yields rise, prices fall. They are not covered by deposit insurance.",
  },
  {
    q: "What makes Zemp & Partner different?",
    a: "We are a FINIG-licensed asset manager. One adviser, one bond book: senior notes, covered bonds and selected subordinated issues from partner issuers.",
  },
  {
    q: "Are these investments suitable for conservative investors?",
    a: "Senior notes and covered bonds are often used for income and lower equity volatility. Suitability still depends on your horizon, liquidity needs and credit appetite.",
  },
  {
    q: "Is Zemp & Partner regulated?",
    a: "Yes. Zemp & Partner Asset Advisory AG is licensed as an asset manager under Art. 17 FINIG. Imprint and commercial-register details are below.",
  },
  {
    q: "What types of bonds do you offer?",
    a: "Senior unsecured notes, covered bonds and selected subordinated issues. Indicative yields, coupons and maturities are shown in the marketplace after login.",
  },
  {
    q: "How often will I receive income payments?",
    a: "Most issues in the book pay coupon semi-annually or annually. The exact schedule is on each bond’s terms.",
  },
  {
    q: "How much do I need to start?",
    a: "Illustrative lots start around USD 5,000 per issue. The calculator lets you model from USD 1,000. Live minimums are confirmed when you allocate.",
  },
  {
    q: "Can I speak with an adviser before investing?",
    a: "Yes. Open an account or request an intro meeting — there is no obligation.",
  },
  {
    q: "What fees are involved?",
    a: "Advice and custody terms are disclosed before you allocate. Yields on this page are illustrative and do not include fees or taxes.",
  },
];

function Icon({ d }: { d: string }) {
  return (
    <svg className="cn-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const FEATURES = [
  {
    icon: "M4 19V5m0 14h16M8 17V9m4 8V7m4 10v-6",
    title: "Tailored investment strategies",
    copy: "Customised bond allocations focused on capital preservation, coupon income and a horizon that fits you.",
  },
  {
    icon: "M12 3l8 4v5c0 5-3.4 8.4-8 9.5C7.4 20.4 4 17 4 12V7l8-4z",
    title: "Secure your financial future",
    copy: "Fixed-income issues for investors who want stability and a stated repayment date rather than equity volatility.",
  },
  {
    icon: "M12 2l2.4 7.2H22l-6 4.4 2.3 7.2L12 16.6 5.7 20.8 8 13.6 2 9.2h7.6L12 2z",
    title: "Exclusive investment access",
    copy: "Senior notes, covered bonds and selected subordinated issues from partner issuers — in one book, one login.",
  },
];

const OFFERS = [
  { title: "Investment strategies", copy: "Income, protection and a stated horizon — sized to your objectives, not a model portfolio off the shelf." },
  { title: "Financial planning", copy: "Cash-flow, pension and succession conversations alongside the bond book, for private and professional clients." },
  { title: "Bond allocation", copy: "Compare yield, coupon, rating and maturity, then allocate. Bonds sit in custody — they are not deposits." },
  { title: "Retirement income", copy: "Coupon schedules that can support spending plans without relying on equity-market timing." },
  { title: "Fixed-rate bonds", copy: "Senior and covered issues with a defined coupon — suited to investors who want lower volatility than stocks." },
  { title: "Marketplace access", copy: "One login for the live book after you open an account. Indicative figures on this page are not an offer." },
];

export function PublicHome() {
  useChromeMotion();
  const [openFaq, setOpenFaq] = useState(0);
  useEffect(() => {
    document.documentElement.lang = "en";
    document.documentElement.classList.remove("motion");
    document.title = "Zemp & Partner — Bond investments";
  }, []);

  return (
    <>
      <SiteNav />

      <section className="hero" id="top">
        <div className="wrap hero-grid">
          <div>
            <p className="kicker">FINIG-licensed asset manager · Canton of Zug</p>
            <h1>Bond investments, from one adviser.</h1>
            <p className="hero-sub">
              Zemp &amp; Partner is a FINIG-licensed asset manager. We help you lend to governments and corporations through bonds — IOUs that pay interest and repay principal at maturity.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-dark" to="/signup">
                Open account
              </Link>
              <Link className="btn btn-outline" to="/login">
                Log in
              </Link>
            </div>
            <ul className="trust">
              <li>FINIG-licensed</li>
              <li>Founded 2006</li>
              <li>Canton of Zug</li>
            </ul>
          </div>
          <aside className="hero-rates" aria-label="Current indicative yields">
            <header>
              <p>Indicative yields</p>
              <span>For illustration</span>
            </header>
            <div className="hero-rate">
              <div>
                <b>Western Alliance Bank</b>
                <span>Senior notes 2027 · YTM</span>
              </div>
              <strong>4.20%</strong>
            </div>
            <div className="hero-rate">
              <div>
                <b>CNB Bank</b>
                <span>Senior notes 2028 · YTM</span>
              </div>
              <strong>4.17%</strong>
            </div>
            <div className="hero-rate">
              <div>
                <b>Merrick Bank</b>
                <span>Senior notes 2029 · YTM</span>
              </div>
              <strong>4.16%</strong>
            </div>
            <a className="hero-rates-link" href="#rates">
              Open the bond calculator
            </a>
          </aside>
        </div>
      </section>

      <section className="why" id="why">
        <div className="wrap explain">
          <p className="kicker">Fixed income</p>
          <h2>What are bonds?</h2>
          <p className="lead">
            Bonds are essentially IOUs. Unlike stocks, which represent ownership in a company, bonds represent a loan that must be repaid with interest. Governments or corporations issue bonds when they want to raise funds for large projects or operations. Generally, when you invest in bonds, you are lending money to the issuer in exchange for periodic interest payments.
          </p>
          <p>
            Generally, bonds have a set maturity date — the date when the issuer must fully repay the loan. Bonds typically have terms ranging from one to 30 years.
          </p>
          <p>
            Bonds are considered ‘fixed income’ investments because they provide investors with regular, pre-determined income through interest payments, offering a steady cash flow.
          </p>
        </div>
      </section>

      <section className="cn-band cn-calc-band" id="rates">
        <div className="wrap cn-intro">
          <p className="cn-eyebrow">Strategic financial growth</p>
          <h2>Your wealth, thoughtfully managed</h2>
          <p>
            We provide tailored bond strategies that prioritise capital protection, consistent income and long-term value — whether you are planning for retirement or building a diversified book.
          </p>
        </div>
        <div className="wrap">
          <BondCalculator />
        </div>
      </section>

      <section className="cn-band" id="keytools">
        <div className="wrap cn-cards">
          {FEATURES.map((item) => (
            <article className="cn-card" key={item.title}>
              <Icon d={item.icon} />
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cn-band cn-soft" id="commitment">
        <div className="wrap cn-split">
          <div>
            <p className="cn-eyebrow">Our commitment</p>
            <h2>Your partner in income, access and risk</h2>
            <p>
              We help you grow and protect wealth through structured, risk-aware bond solutions. Stable coupons, capital at maturity (subject to credit) and a clear view of what you hold.
            </p>
          </div>
          <ol className="cn-steps">
            <li>
              <span>01</span>
              <div>
                <h3>Open an account</h3>
                <p>Register and access the bond book: senior notes, covered bonds and selected subordinated issues.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Consultation</h3>
                <p>Speak with the adviser to match amount, horizon and credit appetite — no obligation.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>See income accrue</h3>
                <p>Coupons pay on schedule. Hold to maturity to target the stated yield, subject to issuer risk.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="cn-band" id="offer">
        <div className="wrap">
          <p className="cn-eyebrow">What we offer</p>
          <h2>Bespoke investment solutions</h2>
          <div className="cn-offer">
            {OFFERS.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cn-band cn-soft" id="advice">
        <div className="wrap cn-copy">
          <p className="cn-eyebrow">Financial growth</p>
          <h2>Trusted advice, backed by experience</h2>
          <p>
            Advisers at Zemp &amp; Partner work with you on structured bond plans. Whether you want dependable coupons or a ladder across maturities, the starting point is your horizon and risk — not a product push.
          </p>
          <p>
            We take time to understand income targets and capital preservation so you can decide with a clear view of credit, duration and liquidity.
          </p>
        </div>
      </section>

      <section className="cn-cta" id="act">
        <div className="wrap">
          <p className="cn-eyebrow">Act now</p>
          <h2>Take control of your wealth — with confidence</h2>
          <p>Partner with Zemp &amp; Partner for bond strategies that prioritise income, stability and a known maturity date.</p>
          <Link className="bc-cta cn-cta-btn" to="/signup">
            Open account →
          </Link>
        </div>
      </section>

      <section className="cn-band" id="whyus">
        <div className="wrap">
          <p className="cn-eyebrow">Why choose us</p>
          <h2>Invest with clarity and control</h2>
          <div className="cn-why">
            <article>
              <h3>Expert guidance</h3>
              <p>Advice from a FINIG-licensed asset manager with a focus on fixed income, not trading noise.</p>
            </article>
            <article>
              <h3>Collaborative approach</h3>
              <p>Strategies aligned with your income, preservation and succession goals — reviewed with you, not sold at you.</p>
            </article>
            <article>
              <h3>Transparent book</h3>
              <p>Yields, coupons, ratings and maturities in one view. Illustrative calculator figures are labelled as such.</p>
            </article>
            <article>
              <h3>Direct support</h3>
              <p>The same adviser remains your contact after you open an account — office in Canton of Zug.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="cn-band cn-soft" id="faq">
        <div className="wrap cn-faq">
          <div>
            <p className="cn-eyebrow">Questions</p>
            <h2>Most popular questions</h2>
          </div>
          <div>
            {FAQS.map((item, index) => (
              <div className={openFaq === index ? "acc open" : "acc"} key={item.q}>
                <button
                  className="acc-head"
                  type="button"
                  aria-expanded={openFaq === index}
                  onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                >
                  {item.q}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {openFaq === index ? (
                  <div className="acc-body">
                    <p>{item.a}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="legal" id="imprint">
        <div className="wrap">
          <p className="kicker">Information pursuant to Art. 3(1)(s) UWG</p>
          <h2>Imprint</h2>
          <dl>
            <dt>Company</dt>
            <dd>Zemp & Partner Asset Advisory AG</dd>
            <dt>Legal form</dt>
            <dd>Company limited by shares (AG)</dd>
            <dt>Registered office</dt>
            <dd>Lindenstrasse 10, 6340 Baar, Canton of Zug</dd>
            <dt>UID</dt>
            <dd>CHE-113.281.174</dd>
            <dt>Licence</dt>
            <dd>Asset manager under Art. 17(1) FINIG</dd>
            <dt>Board</dt>
            <dd>Raimund Zemp — Chairman; Michael Zemp — Board member</dd>
          </dl>
        </div>
      </section>

      <section className="legal" id="privacy">
        <div className="wrap">
          <p className="kicker">Privacy</p>
          <h2>Privacy policy</h2>
          <p>The controller is Zemp & Partner Asset Advisory AG, Lindenstrasse 10, 6340 Baar.</p>
          <p>
            This page is a company presentation. We do not use advertising analytics. Technical server logs (IP, time, requested file) are used for operation and security.
          </p>
        </div>
      </section>

      <footer>
        <div className="wrap foot-grid">
          <div className="foot-brand">
            <a className="nav-logo" href="#top">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="12" height="12" rx="2" fill="#1a3a32" />
                <rect x="10" y="10" width="12" height="12" rx="2" fill="#5ebb7d" />
              </svg>
              Zemp & Partner
            </a>
            <p>FINIG-licensed asset manager. Lindenstrasse 10, 6340 Baar.</p>
          </div>
          <div className="foot-col">
            <h5>Site</h5>
            <a href="#why">What are bonds?</a>
            <a href="#rates">Calculator</a>
            <a href="#offer">What we offer</a>
            <a href="#faq">Questions</a>
            <a href={safeUrl("https://maps.google.com/?q=47.1838,8.5178")}>Map</a>
          </div>
          <div className="foot-col">
            <h5>Legal</h5>
            <a href="#imprint">Imprint</a>
            <a href="#privacy">Privacy</a>
            <a href={publicPath("app.html")}>Marketplace login</a>
          </div>
        </div>
        <div className="foot-bar">© 2026 Zemp & Partner Asset Advisory AG · CHE-113.281.174 · Baar</div>
      </footer>
    </>
  );
}
