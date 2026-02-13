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

// Handle 401 properly
instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config || {};

        // Prevent refresh loop if refresh endpoint itself fails
        if (originalRequest?.url?.includes("/token/refresh_token")) {
            return Promise.reject(error);
        }

        if (!originalRequest || originalRequest._retry) {
            return Promise.reject(error);
        }

        if (
            typeof window !== "undefined" &&
            error?.response?.status === 401 &&
            !originalRequest._retry
        ) {
            // Prevent infinite loop
            originalRequest._retry = true;

            // If already refreshing, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    subscribeTokenRefresh((token) => {
                        if (!token) {
                            reject(error);
                            return;
                        }

                        originalRequest.headers = originalRequest.headers || {};
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(instance(originalRequest));
                    });
                });
            }

            isRefreshing = true;

            const refreshed = await refreshAccessToken();

            if (!refreshed) {
                isRefreshing = false;
                onRefreshed(null);
                await logout("/login");
                return Promise.reject(error);
            }

            const newToken = getStoredAccessToken();

            isRefreshing = false;
            onRefreshed(newToken);

            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            return instance(originalRequest);
        }

        return Promise.reject(error);
    }
);

export default instance;