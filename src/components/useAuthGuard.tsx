"use client";

import { useEffect, useState } from "react";

/**
 * Attempt refresh using httpOnly refresh cookie.
 * Backend must read refresh token from cookie.
 */
async function tryRefreshToken(): Promise<boolean> {
    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE}/token/refresh_token`,
            {
                method: "POST",
                credentials: "include", // 🔥 IMPORTANT
            }
        );

        if (!res.ok) return false;

        const data = await res.json();

        if (!data?.accessToken) return false;

        // Store new access token
        localStorage.setItem("accessToken", data.accessToken);

        // Notify entire app
        window.dispatchEvent(new Event("authChanged"));

        return true;
    } catch (err) {
        console.error("Refresh token failed", err);
        return false;
    }
}

/**
 * useAuthGuard
 * - Simple and backend-driven
 * - No JWT decoding
 * - No manual expiry logic
 */
export default function useAuthGuard({
    verifyWithServer = false,
}: {
    verifyWithServer?: boolean;
} = {}) {
    const [ready, setReady] = useState(false);
    const [isAuthed, setIsAuthed] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function check() {
            const token = localStorage.getItem("accessToken");

            // ✅ If access token exists → user is logged in
            if (token) {
                if (!mounted) return;
                setIsAuthed(true);
                setReady(true);
                return;
            }

            // ❗ No access token → optionally try refresh
            if (verifyWithServer) {
                const refreshed = await tryRefreshToken();

                if (refreshed && mounted) {
                    setIsAuthed(true);
                    setReady(true);
                    return;
                }
            }

            // ❌ Not authenticated
            if (!mounted) return;
            setIsAuthed(false);
            setReady(true);
        }

        check();

        const onAuthChanged = () => {
            check();
        };

        window.addEventListener("authChanged", onAuthChanged);
        window.addEventListener("storage", onAuthChanged);

        return () => {
            mounted = false;
            window.removeEventListener("authChanged", onAuthChanged);
            window.removeEventListener("storage", onAuthChanged);
        };
    }, [verifyWithServer]);

    return { ready, isAuthed };
}