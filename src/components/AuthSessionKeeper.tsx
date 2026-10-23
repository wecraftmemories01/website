"use client";

import { useEffect } from "react";
import {
    getAuth,
    isTokenValid,
    refreshAccessToken,
    scheduleSilentRefresh,
} from "@/lib/auth";

export default function AuthSessionKeeper() {
    useEffect(() => {
        const resume = () => {
            if (!getAuth()?.customerId) return;
            if (isTokenValid()) scheduleSilentRefresh();
            else void refreshAccessToken();
        };
        resume();
        const onVisible = () => {
            if (document.visibilityState === "visible") resume();
        };
        window.addEventListener("focus", resume);
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("authChanged", resume);
        // Browsers throttle background timers; check whenever active as a fallback.
        const interval = window.setInterval(() => {
            if (document.visibilityState === "visible") resume();
        }, 60_000);
        return () => {
            window.removeEventListener("focus", resume);
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("authChanged", resume);
            window.clearInterval(interval);
        };
    }, []);
    return null;
}