"use client";

import { useEffect, useState } from "react";
import { getStoredAccessToken, refreshAccessToken } from "@/lib/auth";

/** Read the shared auth store, rather than maintaining a second refresh flow. */
export default function useAuthGuard({
    verifyWithServer = false,
}: {
    verifyWithServer?: boolean;
} = {}) {
    const [ready, setReady] = useState(false);
    const [isAuthed, setIsAuthed] = useState(false);

    useEffect(() => {
        let active = true;

        const syncFromStorage = () => {
            if (!active) return;
            setIsAuthed(Boolean(getStoredAccessToken()));
            setReady(true);
        };

        const initialize = async () => {
            // Check the refresh cookie only once at mount, not on every
            // authChanged event (especially important after logging out).
            if (!getStoredAccessToken() && verifyWithServer) {
                await refreshAccessToken();
            }
            syncFromStorage();
        };

        void initialize();
        window.addEventListener("authChanged", syncFromStorage);
        window.addEventListener("storage", syncFromStorage);

        return () => {
            active = false;
            window.removeEventListener("authChanged", syncFromStorage);
            window.removeEventListener("storage", syncFromStorage);
        };
    }, [verifyWithServer]);

    return { ready, isAuthed };
}