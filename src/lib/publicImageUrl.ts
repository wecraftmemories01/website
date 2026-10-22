/**
 * Normalize image URLs from older API responses (HTTP behind a TLS reverse proxy).
 * Images live at /uploads at the API root, never /v1/uploads.
 * Preserve local development addresses and non-upload website assets.
 */
export function publicImageUrl(value?: string | null): string | null {
    if (!value || typeof value !== 'string' || !value.trim()) return null;
    const raw = value.trim().replace(/\\/g, '/');
    if (/^(?:javascript|data):/i.test(raw)) return null;
    if (/^blob:/i.test(raw)) return raw;

    const apiBase = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL;
    const override = process.env.NEXT_PUBLIC_HAMPER_IMAGE_ORIGIN;
    let apiOrigin: URL | null = null;
    try { if (apiBase && /^https?:\/\//i.test(apiBase)) apiOrigin = new URL(apiBase); } catch { /* no public API origin */ }
    let overrideOrigin: URL | null = null;
    try { if (override && /^https?:\/\//i.test(override)) overrideOrigin = new URL(override); } catch { /* no override */ }

    const knownPublicHost = 'api.wecraftmemories.com';
    const normalize = (url: URL): string => {
        if (url.hostname === knownPublicHost && url.protocol === 'http:') url.protocol = 'https:';
        if (apiOrigin && url.protocol === 'http:' && apiOrigin.protocol === 'https:' && url.hostname === apiOrigin.hostname) {
            url.protocol = 'https:';
        }
        return url.href;
    };

    if (/^https?:\/\//i.test(raw)) {
        try {
            const parsed = new URL(raw);
            // An internal upstream hostname in an upload URL is not a usable browser hostname.
            if (/^\/uploads\//.test(parsed.pathname) && apiOrigin &&
                ['localhost', '127.0.0.1'].includes(parsed.hostname) &&
                !['localhost', '127.0.0.1'].includes(apiOrigin.hostname)) {
                return normalize(new URL(parsed.pathname + parsed.search, apiOrigin.origin));
            }
            if (overrideOrigin && parsed.pathname.startsWith('/uploads/')) {
                return normalize(new URL(parsed.pathname + parsed.search, overrideOrigin.origin));
            }
            return normalize(parsed);
        } catch { return null; }
    }

    if (raw.startsWith('//')) {
        try { return normalize(new URL('https:' + raw)); } catch { return null; }
    }
    const uploadMatch = raw.match(/(?:^|\/)(uploads\/[^?#]+)(\?[^#]*)?/i);
    if (uploadMatch) {
        const origin = overrideOrigin || apiOrigin;
        const path = '/' + uploadMatch[1] + (uploadMatch[2] || '');
        return origin ? normalize(new URL(path, origin.origin)) : path;
    }
    if (raw.startsWith('/')) return raw;
    return '/' + raw;
}
