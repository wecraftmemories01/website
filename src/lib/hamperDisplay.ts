/** Turn stored upload paths (and proxy-generated absolute URLs) into public API image URLs.
 * The public API may be behind a reverse proxy: req.protocol/req.host do not always
 * match the externally reachable host, so uploaded images must use our API origin.
 */
export function resolveHamperImageUrl(value?: string | null): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim().replace(/\\/g, '/');
  if (/^(?:data|javascript|blob):/i.test(raw)) return null;

  const absoluteUrl = (input: string | undefined): URL | null => {
    if (!input || !/^https?:\/\//i.test(input)) return null;
    try { return new URL(input); } catch { return null; }
  };

  const original = absoluteUrl(raw);
  // Optional override for cases where the API advertises private/internal hosts.
  const explicitOrigin = absoluteUrl(process.env.NEXT_PUBLIC_HAMPER_IMAGE_ORIGIN);
  const apiOrigin = absoluteUrl(process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL);
  const isLoopback = (hostname: string) => /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i.test(hostname);

  // Extract /uploads/... from relative paths or the absolute API URLs returned
  // by the backend. Never append /v1 here: Express serves /uploads at its root.
  const upload = raw.match(/(?:^|\/)(uploads\/[^?#]+)(\?[^#]*)?/i);
  if (upload) {
    const path = `/${upload[1]}${upload[2] || ''}`;
    if (explicitOrigin) return `${explicitOrigin.origin}${path}`;

    if (original) {
      // The URLs supplied by a local API on localhost:3000 are valid inputs to
      // the Next image optimizer. In particular, do NOT change their port to
      // the website's localhost:3002 when the API base is a relative proxy.
      if (isLoopback(original.hostname) && (!apiOrigin || isLoopback(apiOrigin.hostname))) {
        return `${original.origin}${path}`;
      }
      // If a public API is configured but the server returned its internal
      // hostname, or a proxy-generated HTTP URL, prefer the public API host.
      if (apiOrigin && (isLoopback(original.hostname) ||
        (original.protocol === 'http:' && apiOrigin.protocol === 'https:'))) {
        return `${apiOrigin.origin}${path}`;
      }
      return `${original.origin}${path}`;
    }

    return apiOrigin ? `${apiOrigin.origin}${path}` : path;
  }

  if (original) return original.href;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('/')) return raw;
  return apiOrigin ? `${apiOrigin.origin}/${raw.replace(/^\/+/, '')}` : null;
}

/** Safely use edited HTML descriptions as readable plain text for cards/SEO. */
export function plainTextFromHtml(value?: string | null): string {
  if (!value) return '';
  const entities: Record<string, string> = {
    nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
    ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘',
    rdquo: '”', ldquo: '“', eacute: 'é', Eacute: 'É', copy: '©'
  };
  return value
    .replace(/<\/?(?:br|p|div|li|h[1-6])\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi, (_all, name: string) => {
      if (name[0] === '#') {
        const numeric = name[1]?.toLowerCase() === 'x'
          ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
        return Number.isInteger(numeric) && numeric > 0 && numeric <= 0x10ffff
          && !(numeric >= 0xd800 && numeric <= 0xdfff) ? String.fromCodePoint(numeric) : ' ';
      }
      return entities[name] ?? entities[name.toLowerCase()] ?? `&${name};`;
    })
    .replace(/\s+/g, ' ')
    .trim();
}