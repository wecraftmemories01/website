// lib/auth.ts
import { redirect } from "next/navigation";

const TOKEN_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/v1";

/* -------------------- Storage helpers -------------------- */
export function getStoredAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
}

export function storeAuthTokens(payload: {
    accessToken: string;
    refreshToken?: string;
}) {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, payload.accessToken);
    if (payload.refreshToken) localStorage.setItem(REFRESH_KEY, payload.refreshToken);
}

export function clearAuthTokens() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
}

/**
 * Redirect to login and clear tokens.
 * Use only when the server says the tokens are invalid / refresh fails.
 */
export function redirectToLoginAndClear(): void {
    if (typeof window === "undefined") return;
    clearAuthTokens();
    redirect("/login");
}

/* -------------------- Refresh logic -------------------- */
/**
 * Call your backend refresh endpoint with the refresh token.
 * Expects backend to return { accessToken, refreshToken } on success.
 * Returns true on success (and stores tokens), false on failure.
 */
export async function refreshAccessToken(): Promise<boolean> {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
        console.debug("[auth] No refresh token available.");
        return false;
    }

    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
            console.warn(`[auth] refresh failed with status ${res.status}`);
            return false;
        }

        const data = await res.json().catch(() => null);
        if (!data || !data.accessToken) {
            console.warn("[auth] refresh response invalid:", data);
            return false;
        }

        storeAuthTokens({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken ?? refreshToken,
        });

        console.debug("[auth] refresh succeeded, new tokens stored.");
        return true;
    } catch (err) {
        console.error("[auth] refreshAccessToken error:", err);
        return false;
    }
}

/* -------------------- authFetch (no client-side expiry checks) -------------------- */
/**
 * authFetch attaches accessToken if present. If server responds 401 or
 * returns a message indicating invalid/expired token, it will:
 *  1) attempt refresh
 *  2) if refresh success -> retry original request once
 *  3) if refresh fails -> clear tokens + redirect
 *
 * Usage: const res = await authFetch("/protected", { method: "GET" });
 */
export async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    // Attach token (if any) — do not check expiry client-side
    let token = getStoredAccessToken();

    const headers = new Headers(init?.headers ?? {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.get("Content-Type")) headers.set("Content-Type", "application/json");

    let res = await fetch(input, { ...init, headers });

    // If server returns 401, attempt refresh and retry once
    if (res.status === 401) {
        let body: any = null;
        try {
            body = await res.clone().json().catch(() => null);
        } catch {
            body = null;
        }

        const shouldAttemptRefresh = true; // always attempt on 401
        if (shouldAttemptRefresh) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                const retryToken = getStoredAccessToken();
                const retryHeaders = new Headers(init?.headers ?? {});
                if (retryToken) retryHeaders.set("Authorization", `Bearer ${retryToken}`);
                if (!retryHeaders.get("Content-Type")) retryHeaders.set("Content-Type", "application/json");

                return fetch(input, { ...init, headers: retryHeaders });
            } else {
                console.debug("[auth] Refresh failed after 401, clearing tokens and redirecting");
                redirectToLoginAndClear();
                throw new Error("Authentication required");
            }
        }
    }

    // If server returns other 4xx/5xx with token-related message
    if (res.status >= 400 && res.status < 500) {
        try {
            const maybeJson = await res.clone().json().catch(() => null);
            const msg = ((maybeJson?.message || maybeJson?.error || "") + "").toString().toLowerCase();
            if (msg.includes("invalid token") || msg.includes("token expired") || msg.includes("unauthorized")) {
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    const retryToken = getStoredAccessToken();
                    const retryHeaders = new Headers(init?.headers ?? {});
                    if (retryToken) retryHeaders.set("Authorization", `Bearer ${retryToken}`);
                    if (!retryHeaders.get("Content-Type")) retryHeaders.set("Content-Type", "application/json");
                    return fetch(input, { ...init, headers: retryHeaders });
                } else {
                    redirectToLoginAndClear();
                    throw new Error("Authentication required");
                }
            }
        } catch {
            // ignore parse errors
        }
    }

    return res;
}