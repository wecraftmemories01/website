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
    return data.stalls.map(withCalendarStatus);
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
    return withCalendarStatus(data.stall);
}

/** Use the venue's local calendar day (India), not UTC or the viewer's timezone.
 * A stall remains ongoing for its full final day even after closing hours.
 * The public API may be cached or calculate statuses in a different timezone. */
export function withCalendarStatus(stall: PublicStall): PublicStall {
    const dates = stall.schedule
        .map((day) => day.date)
        .filter(isCalendarDate)
        .sort();
    const start = isCalendarDate(stall.startDate) ? stall.startDate : dates[0];
    const end = isCalendarDate(stall.endDate)
        ? stall.endDate
        : dates[dates.length - 1];
    if (!start || !end) return stall;

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const get = (key: string) =>
        parts.find((part) => part.type === key)?.value || "";
    const today = `${get("year")}-${get("month")}-${get("day")}`;
    const status: StallStatus =
        today < start ? "upcoming" : today > end ? "completed" : "ongoing";
    return { ...stall, status };
}

function isCalendarDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
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