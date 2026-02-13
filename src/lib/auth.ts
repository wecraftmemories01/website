"use client";

const TOKEN_KEY = "accessToken";
const AUTH_KEY = "auth";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/v1";
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/* ---------- types ---------- */
export type AuthShape = {
    customerId?: string;
    token?: {
        accessToken?: string;
        tokenExpiresAt?: string;
        tokenObtainedAt?: string;
        expiresIn?: number;
    }
};

/* ---------- storage helpers ---------- */
export function getAuth(): AuthShape | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("auth");
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

export function storeTokens(accessToken: string) {
    localStorage.setItem(TOKEN_KEY, accessToken);
}

/* ---------- logout ---------- */
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

    // Stop silent refresh timer
    if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }

    // Clear storage
    localStorage.removeItem("accessToken");
    localStorage.removeItem("auth");
    localStorage.removeItem("customerId");
    localStorage.removeItem("rememberedUser");
    localStorage.removeItem("cartProductIds");

    // Notify app
    window.dispatchEvent(new Event("authChanged"));

    // Redirect
    window.location.href = redirectTo;
}

/* ---------- refresh ---------- */
export async function refreshAccessToken(): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/token/refresh_token`, {
            method: "POST",
            credentials: "include", // 🔥 VERY IMPORTANT
        });

        if (!res.ok) return false;

        const data = await res.json();

        if (!data?.accessToken) return false;

        const existingAuth = getAuth();

        persistAuth({
            customerId: data.customerId ?? existingAuth?.customerId,
            token: data,
        });

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

    let res = await fetch(input, {
        ...init,
        headers,
        credentials: "include",
    });

    if (res.status === 401) {

        // ❗ if no token at all, do NOT attempt refresh
        if (!token) {
            return res;
        }

        const refreshed = await refreshAccessToken();

        if (!refreshed) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("auth");
            return res; // ❗ DO NOT call logout here
        }

        const retryToken = getStoredAccessToken();
        const retryHeaders = new Headers(init.headers ?? {});
        if (retryToken) retryHeaders.set("Authorization", `Bearer ${retryToken}`);

        return fetch(input, {
            ...init,
            headers: retryHeaders,
            credentials: "include",
        });
    }

    return res;
}

export function scheduleSilentRefresh() {
    const auth = getAuth();
    if (!auth?.token?.tokenExpiresAt) return;

    const expiry = Date.parse(auth.token.tokenExpiresAt);
    const delay = expiry - Date.now() - 30000; // 30 sec before expiry

    if (refreshTimer) {
        clearTimeout(refreshTimer);
    }

    if (delay > 0) {
        refreshTimer = setTimeout(() => {
            refreshAccessToken();
        }, delay);
    }
}

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