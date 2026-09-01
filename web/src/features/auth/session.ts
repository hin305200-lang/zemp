import { publicPath } from "../../shared/lib/publicPath";

export const SESSION_KEY = "nnfb_session";
export const TOKEN_KEY = "nnfb_token";
export const VISITOR_KEY = "nnfb_vid";
export const CRM_TOKEN_KEY = "nnfb_crm_token";
export const CRM_WHO_KEY = "nnfb_crm_who";

export const DEMO_LOCAL = "demo-local";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export type ClientSession = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  status: string;
  kyc: string;
  createdAt?: string;
};

export function visitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function hasLiveSession(): boolean {
  const token = getToken();
  return Boolean(getSession() && token && token !== DEMO_LOCAL);
}

export function getSession(): ClientSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const rec = parsed as Record<string, unknown>;
    if (typeof rec.id !== "string" || typeof rec.name !== "string") return null;
    return {
      id: rec.id,
      name: rec.name,
      email: typeof rec.email === "string" ? rec.email : "",
      phone: typeof rec.phone === "string" ? rec.phone : "",
      address: typeof rec.address === "string" ? rec.address : "",
      taxId: typeof rec.taxId === "string" ? rec.taxId : "",
      status: typeof rec.status === "string" ? rec.status : "",
      kyc: typeof rec.kyc === "string" ? rec.kyc : "",
      createdAt: typeof rec.createdAt === "string" ? rec.createdAt : undefined,
    };
  } catch {
    return null;
  }
}

export function clearClientAuth(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function persistUserSession(session: ClientSession, token: string): void {
  if (!token) {
    throw new Error("Sign-in failed.");
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(TOKEN_KEY, token);
}

export function persistStaffSession(token: string): void {
  if (!token) {
    throw new Error("Sign-in failed.");
  }
  localStorage.setItem(CRM_TOKEN_KEY, token);
  localStorage.setItem(CRM_WHO_KEY, "Staff");
}

export function goToMarketplace(): void {
  window.location.replace(publicPath("app.html"));
}

export function goToCrm(): void {
  window.location.replace(publicPath("crm/"));
}

export function localDemoSession(email: string, extra?: Partial<ClientSession>): ClientSession {
  return {
    id: extra?.id || "demo-test-user",
    name: extra?.name || "Demo",
    email: extra?.email || email,
    phone: extra?.phone || "",
    address: extra?.address || "",
    taxId: extra?.taxId || "",
    status: extra?.status || "active",
    kyc: extra?.kyc || "verified",
    createdAt: extra?.createdAt || "2026-01-15T10:00:00.000Z",
  };
}
