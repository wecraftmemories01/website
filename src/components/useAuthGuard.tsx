"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Decode JWT payload (no signature validation). Returns payload or null.
 */
function decodeJwt(token: string | null) {
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const payload = parts[1];
        // atob handles base64; replace URL-safe chars
        const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
        // decodeURIComponent/escape to handle unicode safely
        return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
        return null;
    }
}

/**
 * Basic client-side validity check:
 * - token exists
 * - if JWT and has exp, not expired (with 30s skew)
 */
export function isTokenValid(token: string | null) {
    if (!token) return false;
    const payload = decodeJwt(token);
    if (payload && payload.exp) {
        const nowSec = Math.floor(Date.now() / 1000);
        return payload.exp > nowSec + 30;
    }
    // If not a JWT, assume presence = valid (change if you want stricter)
    return true;
}

/**
 * Attempt refresh using refreshToken stored in localStorage.
 * Adjust endpoint and response parsing to your backend.
 * Returns true if new accessToken set.
 */
async function tryRefreshToken(): Promise<boolean> {
    try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) return false;

        const res = await fetch("/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
            credentials: "include",
        });

        if (!res.ok) return false;
        const data = await res.json();
        // EXPECTED RESPONSE SHAPE (adjust if different):
        // { accessToken: "...", refreshToken?: "..." }
        if (data?.accessToken) {
            localStorage.setItem("accessToken", data.accessToken);
            if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
            // notify other parts of app about token change
            window.dispatchEvent(new Event("authChanged"));
            return true;
        }
        return false;
    } catch (err) {
        console.error("Refresh token failed", err);
        return false;
    }
}

/**
 * Hook: useAuthGuard
 * - verifyWithServer: when true, will attempt refresh if token invalid/expired
 * Returns { ready, isAuthed }.
 * When used in protected layouts, you may redirect inside the layout itself (hook does not auto-redirect),
 * but this hook reads/refreshes tokens and avoids hydration/mismatch issues.
 */
export default function useAuthGuard({ verifyWithServer = false } = {}) {
    const router = useRouter();
    const pathname = usePathname();
    const [ready, setReady] = useState(false);
    const [isAuthed, setIsAuthed] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function check() {
            const token = localStorage.getItem("accessToken") || localStorage.getItem("customerToken");

            if (isTokenValid(token)) {
                if (!mounted) return;
                setIsAuthed(true);
                setReady(true);
                return;
            }

            // token missing or expired
            if (verifyWithServer) {
                const refreshed = await tryRefreshToken();
                if (refreshed && mounted) {
                    setIsAuthed(true);
                    setReady(true);
                    return;
                }
            }

            // not authed
            if (!mounted) return;
            setIsAuthed(false);
            setReady(true);

            // Optional: if you want this hook to navigate to login automatically,
            // uncomment the next block. I leave it commented so the consumer (layout) can decide.
            /*
            if (!pathname?.startsWith("/auth") && !pathname?.startsWith("/portal/auth")) {
              router.push("/auth/login");
            }
            */
        }

        check();

        // Listen for auth changes triggered elsewhere (login/logout/refresh)
        const onAuthChanged = () => {
            // re-run check when tokens change
            check();
        };
        window.addEventListener("authChanged", onAuthChanged);
        window.addEventListener("storage", onAuthChanged);

        return () => {
            mounted = false;
            window.removeEventListener("authChanged", onAuthChanged);
            window.removeEventListener("storage", onAuthChanged);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [verifyWithServer, router, pathname]);

    return { ready, isAuthed };
}