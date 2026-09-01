import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, goToMarketplace } from "../features/auth/session";

/** Matches account.html: send members to the marketplace, everyone else to login. */
export function AccountRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = "Your account — Zemp & Partner";
    if (getSession()) goToMarketplace();
    else navigate("/login", { replace: true });
  }, [navigate]);
  return null;
}
