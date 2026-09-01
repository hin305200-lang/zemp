import { useCallback, useState } from "react";
import { clearClientAuth, getSession, getToken } from "./session";

export function useSessionNav() {
  const [session, setSession] = useState(() => getSession());

  const logout = useCallback(() => {
    const token = getToken();
    if (token) {
      void fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ path: location.pathname }),
      }).catch(() => {
        /* logout is best-effort; UI always clears */
      });
    }
    clearClientAuth();
    setSession(null);
  }, []);

  return {
    signedIn: Boolean(session),
    accountLabel: ((session && session.name) || "Account").split(" ")[0] || "Account",
    logout,
  };
}
