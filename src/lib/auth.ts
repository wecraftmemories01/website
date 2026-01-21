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

export function getAuth(): AuthShape | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("auth");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function getAccessToken(): string | null {
    return getAuth()?.token?.accessToken ?? null;
}

export function isTokenValid(): boolean {
    const auth = getAuth();
    const t = auth?.token;
    if (!t?.accessToken) return false;

    if (t.tokenExpiresAt) {
        const exp = Date.parse(t.tokenExpiresAt);
        return Date.now() < exp - 2000;
    }
    return true;
}

export function logout(redirectTo: string = "/login") {
    localStorage.removeItem("auth");
    localStorage.removeItem("rememberedUser");
    window.dispatchEvent(new Event("authChanged"));
    window.location.href = redirectTo;
}