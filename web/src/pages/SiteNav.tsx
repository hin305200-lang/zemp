import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { useSessionNav } from "../features/auth/useSessionNav";
import { publicPath } from "../shared/lib/publicPath";

function Logo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" fill="#1a3a32" />
      <rect x="10" y="10" width="12" height="12" rx="2" fill="#5ebb7d" />
    </svg>
  );
}

export function SiteNav() {
  const { signedIn, accountLabel, logout } = useSessionNav();
  const [open, setOpen] = useState(false);
  const drawerId = useId();

  useEffect(() => {
    const onClose = (): void => setOpen(false);
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = (): void => {
      if (window.innerWidth > 1024) setOpen(false);
    };
    document.addEventListener("nn-close-nav", onClose);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.documentElement.classList.toggle("nav-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.removeEventListener("nn-close-nav", onClose);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
      document.documentElement.classList.remove("nav-open");
    };
  }, [open]);

  return (
    <>
      <nav className="nav" aria-label="Main">
        <div className="nav-inner">
        <a className="nav-logo" href="#top" aria-label="Zemp & Partner home">
          <Logo size={22} />
          Zemp & Partner
        </a>
        <div className="nav-links">
          <a href="#why">Bonds</a>
          <a href="#rates">Calculator</a>
          <a href="#offer">Offer</a>
          <a href="#imprint">Imprint</a>
        </div>
        <div className="nav-actions">
          <Link className="nav-login" to="/login" hidden={signedIn}>
            Log in
          </Link>
          <a className="nav-login" href={publicPath("app.html")} hidden={!signedIn}>
            {accountLabel}
          </a>
          <Link className="nav-cta" to="/signup" hidden={signedIn}>
            Open account
          </Link>
          <button className="nav-cta" type="button" hidden={!signedIn} onClick={logout}>
            Log out
          </button>
          <button
            className="nav-burger"
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls={drawerId}
            onClick={() => setOpen((value) => !value)}
          >
            <span />
          </button>
        </div>
        </div>
      </nav>
      <div className={open ? "nav-drawer open" : "nav-drawer"} id={drawerId}>
        <button className="nav-drawer-dim" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />
        <div className="nav-drawer-panel" role="dialog" aria-label="Site menu">
          <a href="#why" onClick={() => setOpen(false)}>Bonds</a>
          <a href="#rates" onClick={() => setOpen(false)}>Calculator</a>
          <a href="#offer" onClick={() => setOpen(false)}>Offer</a>
          <a href="#imprint" onClick={() => setOpen(false)}>Imprint</a>
          {signedIn ? (
            <>
              <a href={publicPath("app.html")}>{accountLabel}</a>
              <button type="button" onClick={() => { setOpen(false); logout(); }}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>Log in</Link>
              <Link to="/signup" onClick={() => setOpen(false)}>Open account</Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
