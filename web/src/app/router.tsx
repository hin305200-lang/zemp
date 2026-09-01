import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PublicHome } from "../pages/PublicHome";
import { routerBasename } from "../shared/lib/publicPath";
import { RouteError } from "./RouteError";

const LoginPage = lazy(() => import("../pages/Login").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("../pages/Signup").then((m) => ({ default: m.SignupPage })));
const AccountRedirect = lazy(() => import("../pages/AccountRedirect").then((m) => ({ default: m.AccountRedirect })));

function PageLoading() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Inter, system-ui, sans-serif", color: "#5b6170" }}>
      Loading…
    </div>
  );
}

/**
 * Route guards here are UX only. Authorization is enforced by server.py.
 * /app.html and /crm stay on the Python static site until those slices.
 */
export function AppRouter() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <RouteError>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<PublicHome />} />
            <Route path="/index.html" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login.html" element={<Navigate to="/login" replace />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/signup.html" element={<Navigate to="/signup" replace />} />
            <Route path="/account" element={<AccountRedirect />} />
            <Route path="/account.html" element={<Navigate to="/account" replace />} />
          </Routes>
        </Suspense>
      </RouteError>
    </BrowserRouter>
  );
}
