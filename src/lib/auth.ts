"use client";

const TOKEN_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const AUTH_KEY = "auth";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/v1";

/* ---------- types ---------- */
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

/* ---------- storage helpers ---------- */
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

    try {
        const auth = getAuth();
        if (!auth?.token) return false;

        const t = auth.token;

        // Preferred: absolute expiry
        if (t.tokenExpiresAt) {
            const exp = Date.parse(t.tokenExpiresAt);
            if (Number.isNaN(exp)) return false;
            return Date.now() < exp - 2000; // 2s safety buffer
        }

        // Fallback: expiresIn + obtainedAt
        if (typeof t.expiresIn === "number" && t.tokenObtainedAt) {
            const obt = Date.parse(t.tokenObtainedAt);
            if (Number.isNaN(obt)) return false;
            const exp = obt + t.expiresIn * 1000;
            return Date.now() < exp - 2000;
        }

        // Last fallback: token exists
        return Boolean(getStoredAccessToken());
    } catch {
        return false;
    }
}

export function getStoredAccessToken(): string | null {
    if (typeof window === "undefined") return null;

    // preferred
    const direct = localStorage.getItem(TOKEN_KEY);
    if (direct) return direct;

    // fallback
    try {
        const auth = getAuth();
        return auth?.token?.accessToken ?? null;
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

/* ---------- logout ---------- */
export function logout(redirectTo = "/login") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(AUTH_KEY);

    window.dispatchEvent(new Event("authChanged"));
    window.location.href = redirectTo;
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

/* ---------- authFetch (ONLY ONE IN APP) ---------- */
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

        res = await fetch(input, { ...init, headers: retryHeaders });
    }

    return res;
}