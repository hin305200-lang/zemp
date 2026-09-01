import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useChromeMotion } from "../motion/useChromeMotion";
import { safeUrl } from "../shared/lib/safeUrl";
import { publicPath } from "../shared/lib/publicPath";
import { GrowthTable } from "./GrowthTable";
import { SiteNav } from "./SiteNav";

const FAQS = [
  {
    q: "What is Zemp & Partner?",
    a: "Zemp & Partner Asset Advisory AG is a FINIG-licensed asset manager in Baar. The platform is a bond marketplace: senior notes, covered bonds and selected subordinated issues from partner issuers — one login, with the firm as your adviser.",
  },
  {
    q: "Are bonds deposits?",
    a: "No. Bonds are securities held in custody. They are not bank deposits and are not covered by deposit insurance. You take issuer credit risk and market risk: if yields rise, prices fall. Illustrative yields on this page are not an offer.",
  },
  {
    q: "How do I get started?",
    a: "Open an account, sign in, and compare bonds by yield, coupon, rating and maturity. Zemp & Partner Asset Advisory AG in Baar remains the operator — imprint and commercial register are below.",
  },
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
            <p className="kicker">Zemp & Partner Asset Advisory AG · Baar, Zug</p>
            <h1>Bond investments, from one adviser in Baar.</h1>
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
              <li>Office in Baar</li>
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
              View the bond book
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

      <section className="products" id="keytools">
        <div className="wrap">
          <p className="kicker">Benefits of bonds</p>
          <h2>Why investors hold them</h2>
          <div className="product-grid">
            <article>
              <p className="product-meta">Stability</p>
              <h3>Lower volatility</h3>
              <p>Bond prices tend to be less volatile than stocks, providing more price stability.</p>
            </article>
            <article>
              <p className="product-meta">Income</p>
              <h3>Predictable income</h3>
              <p>Most bonds provide a consistent and predictable income stream from interest payments.</p>
            </article>
            <article>
              <p className="product-meta">At maturity</p>
              <h3>Principal repayment</h3>
              <p>If you hold a bond to maturity, you will usually receive your initial investment back.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="growth" id="rates">
        <div className="wrap">
          <p className="kicker">Bond book</p>
          <h2>Current issues</h2>
          <p className="lead">
            Set an amount and horizon, then compare senior notes, covered bonds and subordinated issues. Yields, coupons and a bond ladder update as you filter.
          </p>
          <GrowthTable />
        </div>
      </section>

      <section className="firm" id="firm">
        <div className="wrap firm-grid">
          <div>
            <p className="kicker">The firm</p>
            <h2>An office in Baar, Canton of Zug</h2>
            <p>
              Zemp & Partner Asset Advisory AG has been licensed as an asset manager under FINIG since the firm was founded in 2006. Board: Raimund Zemp (Chairman) and Michael Zemp.
            </p>
          </div>
          <dl className="firm-facts">
            <div>
              <dt>Founded</dt>
              <dd>2006</dd>
            </div>
            <div>
              <dt>Licence</dt>
              <dd>FINIG Art. 17</dd>
            </div>
            <div>
              <dt>UID</dt>
              <dd>CHE-113.281.174</dd>
            </div>
            <div>
              <dt>Ombuds</dt>
              <dd>OFD, since 2020</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="start" id="pricing">
        <div className="wrap">
          <p className="kicker">Get started</p>
          <h2>Three steps</h2>
          <ol className="steps">
            <li>
              <span>1</span>
              <div>
                <h3>Open an account</h3>
                <p>Register with your name, email and a password. No obligation intro meeting in Baar if you prefer to talk first.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <h3>Compare bonds</h3>
                <p>Senior notes, covered bonds and subordinated issues — yield, coupon, rating and maturity in one book.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <h3>Allocate</h3>
                <p>Choose an issue that fits your horizon. Your adviser remains Zemp &amp; Partner. Bonds sit in custody — they are not deposits.</p>
              </div>
            </li>
          </ol>
          <Link className="btn btn-dark" to="/signup">
            Open account
          </Link>
        </div>
      </section>

      <section className="faq">
        <div className="wrap faq-grid">
          <div>
            <p className="kicker">FAQ</p>
            <h2>Questions</h2>
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
          <p className="lead">Authoritative company data from the Swiss commercial register.</p>
          <dl>
            <dt>Company</dt>
            <dd>Zemp & Partner Asset Advisory AG</dd>
            <dt>Legal form</dt>
            <dd>Company limited by shares (AG)</dd>
            <dt>Status</dt>
            <dd>Active · founded 24 November 2006</dd>
            <dt>Registered office</dt>
            <dd>Lindenstrasse 10, 6340 Baar, Canton of Zug</dd>
            <dt>UID</dt>
            <dd>CHE-113.281.174</dd>
            <dt>Commercial register no.</dt>
            <dd>CH-170.3.030.110-6</dd>
            <dt>Latest register update</dt>
            <dd>6 October 2025</dd>
            <dt>Sector</dt>
            <dd>Fund management / K66 — Activities auxiliary to financial services and insurance</dd>
            <dt>Coordinates</dt>
            <dd>47.1838, 8.5178</dd>
            <dt>Board of directors</dt>
            <dd>Raimund Zemp — Chairman of the board; Michael Zemp — Board member</dd>
            <dt>Authorized signatories</dt>
            <dd>Angela Meier — Authorized signatory; Michael Christoph Annen — Authorized signatory (Kuesnacht SZ)</dd>
            <dt>Purpose</dt>
            <dd>
              Asset manager under Art. 17(1) FINIG. Provision of financial services, in particular asset management under Art. 3(c)(3) FIDLEG, as well as services in finance, pension planning and succession for private and professional clients in Switzerland and abroad.
            </dd>
            <dt>LEI</dt>
            <dd>529900KY8CNCGR9ONA21 (ACTIVE)</dd>
            <dt>Ombuds office</dt>
            <dd>Ombuds Office for Financial Service Providers (OFD), FINMA-recognized — member since 23 October 2020</dd>
          </dl>
          <p className="legal-note">
            For legally binding information (e.g. due diligence) we recommend a current extract from the commercial register of the Canton of Zug (Zefix). OFD membership is required for FINIG-licensed asset managers.
          </p>
        </div>
      </section>

      <section className="legal" id="privacy">
        <div className="wrap">
          <p className="kicker">Privacy</p>
          <h2>Privacy policy</h2>
          <p>The controller for data processing on this website is Zemp & Partner Asset Advisory AG, Lindenstrasse 10, 6340 Baar.</p>
          <p>
            This page is a company presentation. We do not use contact forms, tracking cookies or advertising analytics. When you visit, your browser sends technically required data (e.g. IP address, time, requested file) to the server. This data is used for operation and security.
          </p>
          <p>The Inter typeface is served from this website (no Google Fonts request).</p>
          <p>
            If you contact us, we process the details needed for advice. You have the right of access, rectification, erasure, restriction and data portability, and the right to lodge a complaint with the Federal Data Protection and Information Commissioner (FDPIC).
          </p>
        </div>
      </section>

      <footer>
        <div className="wrap foot-grid">
          <div className="foot-brand">
            <a className="nav-logo" href="#top">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="12" height="12" rx="2" fill="#02193d" />
                <rect x="10" y="10" width="12" height="12" rx="2" fill="#1d5a9a" />
              </svg>
              Zemp & Partner
            </a>
            <p>FINIG-licensed asset manager. Lindenstrasse 10, 6340 Baar.</p>
          </div>
          <div className="foot-col">
            <h5>Office</h5>
            <a href="#why">What are bonds?</a>
            <a href="#keytools">Benefits</a>
            <a href="#rates">Bond book</a>
            <a href="#pricing">Get started</a>
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
