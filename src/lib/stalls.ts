import type { PublicStall, StallStatus } from "@/types/stall";

const API_BASE = (
    process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000/v1"
).replace(/\/+$/, "");

async function jsonOrThrow<T>(path: string, signal?: AbortSignal): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        cache: "no-store",
        signal,
    });
    if (!response.ok)
        throw new Error("We couldn't load our stall details right now.");
    return response.json() as Promise<T>;
}

export async function fetchPublicStalls(
    signal?: AbortSignal,
): Promise<PublicStall[]> {
    const data = await jsonOrThrow<{ ack: string; stalls?: PublicStall[] }>(
        "/stalls",
        signal,
    );
    if (data.ack !== "success" || !Array.isArray(data.stalls))
        throw new Error("Invalid stall response");
    return data.stalls;
}

export async function fetchPublicStall(
    id: string,
    signal?: AbortSignal,
): Promise<PublicStall> {
    const data = await jsonOrThrow<{ ack: string; stall?: PublicStall }>(
        `/stalls/${encodeURIComponent(id)}`,
        signal,
    );
    if (data.ack !== "success" || !data.stall)
        throw new Error("This stall isn't available right now.");
    return data.stall;
}

function asUtcDate(date: string) {
    // Calendar-only dates must not shift for visitors in another timezone.
    return new Date(`${date}T12:00:00Z`);
}

export function formatStallDate(
    date: string,
    opts?: Intl.DateTimeFormatOptions,
) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
        ...opts,
    }).format(asUtcDate(date));
}

export function formatStallRange(stall: PublicStall) {
    if (!stall.startDate || !stall.endDate) return "Dates to be announced";
    if (stall.startDate === stall.endDate)
        return formatStallDate(stall.startDate);
    return `${formatStallDate(stall.startDate)} – ${formatStallDate(stall.endDate)}`;
}

export function formatStallTime(value: string) {
    const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
    if (!match) return value;
    const hours = Number(match[1]);
    if (hours > 23 || Number(match[2]) > 59) return value;
    return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? "PM" : "AM"}`;
}

export const STALL_STATUS: Record<
    StallStatus,
    { label: string; className: string }
> = {
    ongoing: {
        label: "Ongoing",
        className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    },
    upcoming: {
        label: "Upcoming",
        className: "bg-sky-50 text-sky-800 ring-sky-200",
    },
    completed: {
        label: "Past stall",
        className: "bg-stone-100 text-stone-700 ring-stone-200",
    },
};

export function stallMapUrl(stall: PublicStall): string | null {
    const place = [stall.locationName, stall.address]
        .filter(Boolean)
        .join(", ");
    return place
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
        : null;
}