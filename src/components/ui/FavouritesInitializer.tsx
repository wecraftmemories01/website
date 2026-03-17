'use client'

import { useEffect } from "react";
import favouritesClient from "@/lib/favouritesClient";

export default function FavouritesInitializer() {

    // INIT (runs once)
    useEffect(() => {
        favouritesClient.init();
    }, []);

    // CROSS-TAB + GLOBAL SYNC (VERY IMPORTANT)
    useEffect(() => {

        const handleSync = () => {
            favouritesClient.refreshFromServerIfAuthorized();
        };

        window.addEventListener("authChanged", handleSync);
        window.addEventListener("favouritesChanged", handleSync);

        return () => {
            window.removeEventListener("authChanged", handleSync);
            window.removeEventListener("favouritesChanged", handleSync);
        };
    }, []);

    return null;
}