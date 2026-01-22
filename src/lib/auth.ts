import { redirect } from "next/navigation";

const TOKEN_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const AUTH_KEY = "auth";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/v1";

/* ---------- legacy auth object helpers ---------- */
export type AuthShape = {
    customerId?: string;
    token?: {
        accessToken?: string;
        refreshToken?: string;
        tokenExpiresAt?: string;
        tokenObtainedAt?: string;
        expiresIn?: number;
    };
};

export function getAuth(): AuthShape | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(AUTH_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function isTokenValid(): boolean {
    if (typeof window === "undefined") return false;

    // 1️⃣ Access token existence
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return false;

    // 2️⃣ Expiry still comes from auth metadata
    const auth = getAuth();
    const t = auth?.token;
    if (!t) return true; // no expiry info → assume valid

    if (t.tokenExpiresAt) {
        const exp = Date.parse(t.tokenExpiresAt);
        return !Number.isNaN(exp) && Date.now() < exp - 2000;
    }

    if (typeof t.expiresIn === "number" && t.tokenObtainedAt) {
        const obt = Date.parse(t.tokenObtainedAt);
        return !Number.isNaN(obt) &&
            Date.now() < obt + t.expiresIn * 1000 - 2000;
    }

    return true;
}

export function logout(redirectTo = "/login") {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    window.dispatchEvent(new Event("authChanged"));
    window.location.href = redirectTo;
}

/* ---------- token helpers ---------- */
export function getStoredAccessToken(): string | null {
    if (typeof window === "undefined") return null;

    // 1️⃣ Preferred (new)
    const direct = localStorage.getItem("accessToken");
    if (direct) return direct;

    // 2️⃣ Backward compatibility (current login flow)
    try {
        const raw = localStorage.getItem("auth");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.token?.accessToken ?? null;
    } catch {
        return null;
    }
}

export function getStoredRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
}

function storeTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

/* ---------- refresh ---------- */
async function refreshAccessToken(): Promise<boolean> {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return false;

    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) return false;

        const data = await res.json();
        if (!data?.accessToken) return false;

        storeTokens(data.accessToken, data.refreshToken);
        return true;
    } catch {
        return false;
    }
}

/* ---------- authFetch ---------- */
export async function authFetch(
    input: RequestInfo,
    init: RequestInit = {}
): Promise<Response> {
    let token = getStoredAccessToken();
    const headers = new Headers(init.headers ?? {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.get("Content-Type"))
        headers.set("Content-Type", "application/json");

    let res = await fetch(input, { ...init, headers });

    if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
            logout();
            throw new Error("Auth required");
        }

        const retryHeaders = new Headers(init.headers ?? {});
        const retryToken = getStoredAccessToken();
        if (retryToken) retryHeaders.set("Authorization", `Bearer ${retryToken}`);
        if (!retryHeaders.get("Content-Type"))
            retryHeaders.set("Content-Type", "application/json");

        return fetch(input, { ...init, headers: retryHeaders });
    }

    return res;
}