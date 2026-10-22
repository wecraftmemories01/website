import axios from "axios";
import { refreshAccessToken, getStoredAccessToken, logout } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

const instance = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: {
        "Cache-Control": "no-store",
        "Pragma": "no-cache",
        "Expires": "0",
    },
});

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

// Attach access token
instance.interceptors.request.use((config) => {
    const token =
        typeof window !== "undefined"
            ? getStoredAccessToken()
            : null;

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// Queue system
function subscribeTokenRefresh(cb: (token: string | null) => void) {
    refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null) {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
}

// Refresh only authenticated requests. A public endpoint returning 401
// must not log out an anonymous shopper or redirect them away from the store.
instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error?.config;
        const authHeader = originalRequest?.headers?.Authorization;
        const hasBearerToken = typeof authHeader === "string" && /^Bearer\s+\S+/i.test(authHeader);

        if (
            typeof window === "undefined" ||
            error?.response?.status !== 401 ||
            !originalRequest ||
            originalRequest._retry ||
            !hasBearerToken ||
            originalRequest.url?.includes("/token/refresh_token")
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                subscribeTokenRefresh((token) => {
                    if (!token) {
                        reject(error);
                        return;
                    }
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    resolve(instance(originalRequest));
                });
            });
        }

        isRefreshing = true;
        let refreshed = false;
        try {
            refreshed = await refreshAccessToken();
        } catch {
            refreshed = false;
        } finally {
            isRefreshing = false;
        }

        const token = refreshed ? getStoredAccessToken() : null;
        onRefreshed(token);

        if (!token) {
            await logout("/login");
            return Promise.reject(error);
        }

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return instance(originalRequest);
    }
);

export default instance;