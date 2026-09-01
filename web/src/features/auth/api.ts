import {
  apiErrorSchema,
  publicUserSchema,
  signupResponseSchema,
  userLoginSchema,
  type LoginFormValues,
  type PublicUser,
  type SignupFormValues,
} from "./schemas";
import { classify } from "./classify";
import {
  DEMO_LOCAL,
  localDemoSession,
  persistStaffSession,
  persistUserSession,
  type ClientSession,
  visitorId,
} from "./session";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function errorMessage(data: unknown, fallback: string): string {
  const parsed = apiErrorSchema.safeParse(data);
  return parsed.success ? parsed.data.error : fallback;
}

export function toClientSession(user: PublicUser): ClientSession {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    address: user.address || "",
    taxId: user.tax_id || user.taxId || "",
    status: user.status || "",
    kyc: user.kyc || "",
    createdAt: user.created_at || user.createdAt || undefined,
  };
}

async function withTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), ms);
  try {
    return await run(ctrl.signal);
  } finally {
    window.clearTimeout(timer);
  }
}

async function probeLive(): Promise<boolean> {
  try {
    const res = await withTimeout(800, (signal) => fetch("/api/health", { cache: "no-store", signal }));
    if (!res.ok) return false;
    const data: unknown = await res.json().catch(() => null);
    return Boolean(data && typeof data === "object" && "ok" in data && data.ok);
  } catch {
    return false;
  }
}

async function postJson(path: string, body: unknown, timeoutMs = 8000): Promise<unknown> {
  let res: Response;
  try {
    res = await withTimeout(timeoutMs, (signal) =>
      fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      }),
    );
  } catch {
    throw new ApiError("offline", 0);
  }
  const data: unknown = await readJson(res);
  if (!res.ok) {
    throw new ApiError(errorMessage(data, "Request failed."), res.status);
  }
  return data;
}

export type LoginResult = { staff: true } | { staff: false; session: ClientSession };

function enterStaff(token: string): LoginResult {
  persistStaffSession(token);
  return { staff: true };
}

export async function loginRequest(values: LoginFormValues): Promise<LoginResult> {
  const email = values.email.trim().toLowerCase();
  const password = values.password.trim();
  const hit = await classify(email, password);

  if (hit.staff) {
    const up = await probeLive();
    if (!up) return enterStaff(DEMO_LOCAL);
    try {
      const data = await postJson("/api/login", { email, password, visitorId: visitorId() });
      const parsed = userLoginSchema.safeParse(data);
      if (parsed.success && parsed.data.kind === "staff") {
        return enterStaff(parsed.data.token);
      }
      return enterStaff(DEMO_LOCAL);
    } catch {
      return enterStaff(DEMO_LOCAL);
    }
  }

  const live = await probeLive();
  if (!live) {
    if (hit.demo) {
      const session = localDemoSession(email);
      persistUserSession(session, DEMO_LOCAL);
      return { staff: false, session };
    }
    throw new ApiError("Cannot reach the account service. Try again in a moment.", 0);
  }

  try {
    const data = await postJson("/api/login", { email, password, visitorId: visitorId() });
    const parsed = userLoginSchema.safeParse(data);
    if (!parsed.success) {
      if (hit.demo) {
        const session = localDemoSession(email);
        persistUserSession(session, DEMO_LOCAL);
        return { staff: false, session };
      }
      throw new ApiError("Sign-in failed.", 0);
    }
    const payload = parsed.data;
    if (payload.kind === "staff") {
      return enterStaff(payload.token);
    }
    const userParsed = publicUserSchema.safeParse(payload.user);
    if (!userParsed.success) {
      if (hit.demo) {
        const session = localDemoSession(email);
        persistUserSession(session, DEMO_LOCAL);
        return { staff: false, session };
      }
      throw new ApiError("Sign-in failed.", 0);
    }
    const session = toClientSession(userParsed.data);
    persistUserSession(session, payload.token);
    return { staff: false, session };
  } catch (err) {
    if (hit.demo) {
      const session = localDemoSession(email);
      persistUserSession(session, DEMO_LOCAL);
      return { staff: false, session };
    }
    if (err instanceof ApiError && err.status === 0) {
      throw new ApiError(
        live ? "Email or password is incorrect." : "Cannot reach the account service. Try again in a moment.",
        0,
      );
    }
    throw err;
  }
}

export async function signupRequest(values: SignupFormValues): Promise<ClientSession> {
  const name = values.name.trim();
  const email = values.email.trim().toLowerCase();
  const phone = values.phone.trim();
  const live = await probeLive();
  if (!live) {
    throw new ApiError("Account service is unavailable. Please try again in a moment.", 0);
  }
  try {
    const data = await postJson(
      "/api/signup",
      {
        name,
        email,
        phone,
        password: values.password,
        confirm: values.confirm,
        visitorId: visitorId(),
      },
      15000,
    );
    const parsed = signupResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError("Account could not be created. Please try again.", 0);
    }
    const session = toClientSession(parsed.data.user);
    persistUserSession(session, parsed.data.token);
    return session;
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) throw err;
    if (err instanceof ApiError && err.message !== "offline") throw err;
    throw new ApiError("Account may already exist, or the server timed out. Try signing in.", 0);
  }
}

export function parseUnknownError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
