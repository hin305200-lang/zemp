import { publicPath } from "../../shared/lib/publicPath";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { useSessionNav } from "./useSessionNav";
import "../../shared/styles/auth.css";

function Logo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" fill="#1a3a32" />
      <rect x="10" y="10" width="12" height="12" rx="2" fill="#5ebb7d" />
    </svg>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  const { signedIn, accountLabel, logout } = useSessionNav();
  const [open, setOpen] = useState(false);
  const drawerId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = (): void => {
      if (window.innerWidth > 1024) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="auth-shell">
      <nav className="nav" aria-label="Main navigation">
        <div className="nav-inner">
        <Link className="nav-logo" to="/" aria-label="Zemp & Partner home">
          <Logo size={22} />
          Zemp & Partner
        </Link>
        <div className="nav-links">
          <Link to="/#why">Bonds</Link>
          <Link to="/#keytools">Benefits</Link>
          <Link to="/#rates">Marketplace</Link>
        </div>
        <Link className="nav-login" to="/login" hidden={signedIn}>
          Log in
        </Link>
        <a className="nav-login" href={publicPath("app.html")} hidden={!signedIn}>
          {accountLabel}
        </a>
        <Link className="nav-cta" to="/signup" hidden={signedIn}>
          Open account
        </Link>
        <button
          className="nav-cta"
          type="button"
          hidden={!signedIn}
          onClick={() => {
            logout();
            window.location.href = publicPath("");
          }}
        >
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
      </nav>
      <div className={open ? "nav-drawer open" : "nav-drawer"} id={drawerId}>
        <button className="nav-drawer-dim" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />
        <div className="nav-drawer-panel" role="dialog" aria-label="Site menu">
          <Link to="/" onClick={() => setOpen(false)}>Home</Link>
          <Link to="/#why" onClick={() => setOpen(false)}>Bonds</Link>
          <Link to="/#keytools" onClick={() => setOpen(false)}>Benefits</Link>
          <Link to="/#rates" onClick={() => setOpen(false)}>Marketplace</Link>
          {signedIn ? (
            <>
              <a href={publicPath("app.html")}>{accountLabel}</a>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                  window.location.href = publicPath("");
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>Log in</Link>
              <Link to="/signup" onClick={() => setOpen(false)}>Open account</Link>
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
