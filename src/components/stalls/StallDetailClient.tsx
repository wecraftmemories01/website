"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    ArrowUpRight,
    CalendarDays,
    ChevronDown,
    Clock3,
    MapPin,
    Navigation,
    Store,
    Ticket,
} from "lucide-react";
import type { PublicStall } from "@/types/stall";
import {
    fetchPublicStall,
    formatStallDate,
    formatStallRange,
    formatStallTime,
    stallMapUrl,
} from "@/lib/stalls";
import StallShowcaseGallery from "./StallShowcaseGallery";

const statusStyles = {
    ongoing: {
        label: "Happening now",
        classes: "bg-[#e7f8ef] text-[#16734d]",
        dot: "bg-[#21a874]",
    },
    upcoming: {
        label: "Coming soon",
        classes: "bg-[#eaf5fb] text-[#146e89]",
        dot: "bg-[#318cb8]",
    },
    completed: {
        label: "Past stall",
        classes: "bg-[#f0f2f3] text-[#6b7d85]",
        dot: "bg-[#9aaab0]",
    },
} as const;

export default function StallDetailClient({ stallId }: { stallId: string }) {
    const [stall, setStall] = useState<PublicStall | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    const [showSchedule, setShowSchedule] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        fetchPublicStall(stallId, controller.signal)
            .then((data) => {
                setStall(data);
                setError(false);
            })
            .catch(() => {
                if (!controller.signal.aborted) setError(true);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [stallId, retry]);

    if (loading)
        return (
            <div
                className="mx-auto max-w-[1450px] animate-pulse py-4"
                role="status"
                aria-label="Loading stall details"
            >
                <div className="h-10 w-44 rounded-xl bg-[#eaf2f5]" />
                <div className="mt-4 h-36 rounded-3xl bg-[#eaf2f5]" />
                <div className="mt-4 h-52 rounded-3xl bg-[#eaf2f5]" />
            </div>
        );
    if (error || !stall)
        return (
            <div className="mx-auto max-w-xl px-5 py-20 text-center">
                <Store size={36} className="mx-auto text-[#88a3ad]" />
                <h1 className="mt-4 text-2xl font-bold text-[#173b4a]">
                    Stall details aren't available
                </h1>
                <p className="mt-2 text-sm text-[#718690]">
                    The stall may have been removed, or the connection isn't
                    working.
                </p>
                <div className="mt-5 flex justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setLoading(true);
                            setRetry((n) => n + 1);
                        }}
                        className="rounded-xl bg-[#0b6985] px-5 py-2.5 text-sm font-bold text-white"
                    >
                        Try again
                    </button>
                    <Link
                        href="/stalls"
                        className="rounded-xl border border-[#d5e2e8] bg-white px-5 py-2.5 text-sm font-bold text-[#245064]"
                    >
                        All stalls
                    </Link>
                </div>
            </div>
        );

    const color = statusStyles[stall.status];
    const mapUrl = stallMapUrl(stall);
    const daysToShow = showSchedule
        ? stall.schedule
        : stall.schedule.slice(0, 2);
    const remainingDays = Math.max(0, stall.schedule.length - 2);

    return (
        <div className="mx-auto w-full max-w-[1450px] pb-9 text-[#173b4a]">
            <Link
                href="/stalls"
                className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#547581] transition hover:text-[#096c87]"
            >
                <ArrowLeft size={16} /> All stalls
            </Link>

            <header className="rounded-[24px] border border-[#e1ebef] bg-[linear-gradient(105deg,#ecf8fa,#fffaf5)] px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${color.classes}`}
                            >
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${color.dot}`}
                                />{" "}
                                {color.label}
                            </span>
                            {stall.stallNumber && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#687e87]">
                                    <Ticket size={14} /> Stall{" "}
                                    {stall.stallNumber}
                                </span>
                            )}
                        </div>
                        <h1 className="mt-2 font-serif text-[clamp(1.85rem,3.3vw,2.7rem)] font-semibold leading-tight tracking-tight text-[#143e50]">
                            {stall.name}
                        </h1>
                        {stall.description && (
                            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#627c85]">
                                {stall.description}
                            </p>
                        )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        {stall.products.length > 0 && (
                            <a
                                href="#stall-showcase"
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#c9dfe7] bg-white px-4 py-2 text-[13px] font-bold text-[#176d86] transition hover:bg-[#eff9fb]"
                            >
                                See showcased products{" "}
                                <ArrowUpRight size={16} />
                            </a>
                        )}
                        {mapUrl && (
                            <a
                                href={mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0b6985] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#07536b]"
                            >
                                <Navigation size={16} /> Get directions
                            </a>
                        )}
                    </div>
                </div>
            </header>

            <section
                className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1.25fr]"
                aria-label="Plan your visit"
            >
                <div className="rounded-[20px] border border-[#e4ebee] bg-white p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf7fa] text-[#197b98]">
                            <CalendarDays size={19} />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#76909b]">
                                When
                            </h2>
                            <p className="mt-1 text-sm font-bold text-[#254b5b]">
                                {formatStallRange(stall)}
                            </p>
                            <p className="mt-1 text-xs text-[#718993]">
                                {stall.dayCount}{" "}
                                {stall.dayCount === 1 ? "day" : "days"}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-[20px] border border-[#e4ebee] bg-white p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf7fa] text-[#197b98]">
                            <Clock3 size={19} />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#76909b]">
                                Timings
                            </h2>
                            {stall.schedule.length > 0 ? (
                                <>
                                    <p className="mt-1 text-sm font-bold text-[#254b5b]">
                                        {formatStallTime(
                                            stall.schedule[0].startTime,
                                        )}{" "}
                                        –{" "}
                                        {formatStallTime(
                                            stall.schedule[0].endTime,
                                        )}
                                    </p>
                                    <p className="mt-1 text-xs text-[#718993]">
                                        {stall.schedule.length > 1
                                            ? "Daily hours below"
                                            : "Stall hours"}
                                    </p>
                                </>
                            ) : (
                                <p className="mt-1 text-sm font-semibold text-[#617b87]">
                                    To be announced
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="rounded-[20px] border border-[#e4ebee] bg-white p-4 sm:p-5 md:col-span-2 lg:col-span-1">
                    <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf7fa] text-[#197b98]">
                            <MapPin size={19} />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#76909b]">
                                Where
                            </h2>
                            <p className="mt-1 text-sm font-bold text-[#254b5b]">
                                {stall.locationName || "Venue to be announced"}
                            </p>
                            {stall.address && (
                                <p className="mt-1 text-xs leading-5 text-[#718993]">
                                    {stall.address}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {stall.schedule.length > 1 && (
                <section
                    className="mt-3 rounded-[20px] border border-[#e4ebee] bg-white px-4 py-3 sm:px-5"
                    aria-label="Daily stall timings"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-sm font-bold text-[#244b5a]">
                            Daily opening hours
                        </h2>
                        {remainingDays > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowSchedule((v) => !v)}
                                aria-expanded={showSchedule}
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#0a7795] hover:underline"
                            >
                                {showSchedule
                                    ? "Show less"
                                    : `View ${remainingDays} more ${remainingDays === 1 ? "day" : "days"}`}{" "}
                                <ChevronDown
                                    size={15}
                                    className={showSchedule ? "rotate-180" : ""}
                                />
                            </button>
                        )}
                    </div>
                    <div className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                        {daysToShow.map((day, index) => (
                            <div
                                key={`${day.date}-${index}`}
                                className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eff3f5] py-2 text-xs sm:text-[13px]"
                            >
                                <span className="font-semibold text-[#4d6b78]">
                                    {formatStallDate(day.date, {
                                        weekday: "short",
                                        day: "numeric",
                                        month: "short",
                                    })}
                                </span>
                                <span className="font-bold text-[#176d88]">
                                    {formatStallTime(day.startTime)} –{" "}
                                    {formatStallTime(day.endTime)}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {stall.products.length > 0 && (
                <StallShowcaseGallery
                    products={stall.products}
                    status={stall.status}
                />
            )}
        </div>
    );
}