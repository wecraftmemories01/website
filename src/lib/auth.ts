"use client";

const TOKEN_KEY = "accessToken";
const AUTH_KEY = "auth";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/v1";

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/* =========================
   Types
========================= */

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

/* =========================
   Storage Helpers
========================= */

export function getAuth(): AuthShape | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = localStorage.getItem(AUTH_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function getStoredAccessToken(): string | null {
    if (typeof window === "undefined") return null;

    const direct = localStorage.getItem(TOKEN_KEY);
    if (direct) return direct;

    try {
        const auth = getAuth();
        return auth?.token?.accessToken ?? null;
    } catch {
        return null;
    }
}

export function storeTokens(accessToken: string) {
    localStorage.setItem(TOKEN_KEY, accessToken);
}

/* =========================
   Token Validation
========================= */

export function isTokenValid(): boolean {
    if (typeof window === "undefined") return false;

    try {
        const auth = getAuth();
        if (!auth?.token) return false;

        const t = auth.token;

        if (t.tokenExpiresAt) {
            const exp = Date.parse(t.tokenExpiresAt);
            if (Number.isNaN(exp)) return false;
            return Date.now() < exp - 2000;
        }

        if (typeof t.expiresIn === "number" && t.tokenObtainedAt) {
            const obt = Date.parse(t.tokenObtainedAt);
            if (Number.isNaN(obt)) return false;
            const exp = obt + t.expiresIn * 1000;
            return Date.now() < exp - 2000;
        }

        return Boolean(getStoredAccessToken());
    } catch {
        return false;
    }
}

/* =========================
   Logout
========================= */

export async function logout(redirectTo = "/login") {
    try {
        const token = getStoredAccessToken();

        await fetch(`${API_BASE}/customer/logout`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
    } catch (e) {
        console.error("Logout API failed", e);
    }

    if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem("customerId");
    localStorage.removeItem("rememberedUser");
    localStorage.removeItem("cartProductIds");

    window.dispatchEvent(new Event("authChanged"));
    window.location.href = redirectTo;
}

/* =========================
   Refresh Token
========================= */

export async function refreshAccessToken(): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/token/refresh_token`, {
            method: "POST",
            credentials: "include",
        });

        if (!res.ok) return false;

        const data = await res.json();
        if (!data?.accessToken) return false;

        const existingAuth = getAuth();

        persistAuth({
            customerId: data.customerId ?? existingAuth?.customerId,
            token: {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                expiresIn: data.expiresIn,
            },
        });

        return true;
    } catch {
        return false;
    }
}

/* =========================
   Universal authFetch
========================= */

export async function authFetch(
    input: RequestInfo,
    init: RequestInit = {}
): Promise<Response> {

    let token = getStoredAccessToken();
    const headers = new Headers(init.headers ?? {});

    // 🔥 Automatically set JSON header if body exists
    if (init.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    let res = await fetch(input, {
        ...init,
        headers,
        credentials: "include",
    });

    if (res.status === 401) {

        if (!token) return res;

        const refreshed = await refreshAccessToken();
        if (!refreshed) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(AUTH_KEY);
            return res;
        }

        const retryToken = getStoredAccessToken();
        const retryHeaders = new Headers(init.headers ?? {});

        // 🔥 Re-apply JSON header on retry
        if (init.body && !retryHeaders.has("Content-Type")) {
            retryHeaders.set("Content-Type", "application/json");
        }

        if (retryToken) {
            retryHeaders.set("Authorization", `Bearer ${retryToken}`);
        }

        return fetch(input, {
            ...init,
            headers: retryHeaders,
            credentials: "include",
        });
    }

    return res;
}

/* =========================
   Silent Refresh Scheduler
========================= */

export function scheduleSilentRefresh() {
    const auth = getAuth();
    if (!auth?.token?.tokenExpiresAt) return;

    const expiry = Date.parse(auth.token.tokenExpiresAt);
    const delay = expiry - Date.now() - 30000;

    if (refreshTimer) {
        clearTimeout(refreshTimer);
    }

    if (delay > 0) {
        refreshTimer = setTimeout(() => {
            refreshAccessToken();
        }, delay);
    }
}

/* =========================
   Persist Auth
========================= */

export function persistAuth(data: AuthShape | null) {
    if (!data?.token?.accessToken) return;

    const now = Date.now();
    const expiresIn = data.token.expiresIn ?? 0;

    const tokenObtainedAt = new Date(now).toISOString();
    const tokenExpiresAt = expiresIn
        ? new Date(now + expiresIn * 1000).toISOString()
        : undefined;

    localStorage.setItem(
        AUTH_KEY,
        JSON.stringify({
            customerId: data.customerId,
            token: {
                accessToken: data.token.accessToken,
                refreshToken: data.token.refreshToken,
                expiresIn,
                tokenObtainedAt,
                tokenExpiresAt,
            },
        })
    );

    localStorage.setItem(TOKEN_KEY, data.token.accessToken);

    scheduleSilentRefresh();
    window.dispatchEvent(new Event("authChanged"));
}