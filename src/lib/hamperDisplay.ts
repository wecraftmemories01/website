import { publicImageUrl } from "./publicImageUrl";

/** Turn stored upload paths (and proxy-generated absolute URLs) into public API image URLs.
 * The public API may be behind a reverse proxy: req.protocol/req.host do not always
 * match the externally reachable host, so uploaded images must use our API origin.
 */
export function resolveHamperImageUrl(value?: string | null): string | null {
  return publicImageUrl(value);
}

/** Safely use edited HTML descriptions as readable plain text for cards/SEO. */
export function plainTextFromHtml(value?: string | null): string {
  if (!value) return "";
  const entities: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    ndash: "–",
    mdash: "—",
    hellip: "…",
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
    eacute: "é",
    Eacute: "É",
    copy: "©",
  };
  return value
    .replace(/<\/?(?:br|p|div|li|h[1-6])\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi, (_all, name: string) => {
      if (name[0] === "#") {
        const numeric =
          name[1]?.toLowerCase() === "x"
            ? parseInt(name.slice(2), 16)
            : parseInt(name.slice(1), 10);
        return Number.isInteger(numeric) &&
          numeric > 0 &&
          numeric <= 0x10ffff &&
          !(numeric >= 0xd800 && numeric <= 0xdfff)
          ? String.fromCodePoint(numeric)
          : " ";
      }
      return entities[name] ?? entities[name.toLowerCase()] ?? `&${name};`;
    })
    .replace(/\s+/g, " ")
    .trim();
}
