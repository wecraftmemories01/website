"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Clock3,
    MapPin,
    Navigation,
    ShoppingBag,
    Sparkles,
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
    STALL_STATUS,
} from "@/lib/stalls";
import StallShowcaseGallery from "./StallShowcaseGallery";

export default function StallDetailClient({ stallId }: { stallId: string }) {
    const [stall, setStall] = useState<PublicStall | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);

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

    if (loading) {
        return (
            <div className="mx-auto max-w-[1360px] animate-pulse space-y-5 py-6">
                <div className="h-10 w-40 rounded-full bg-[#edf4f6]" />
                <div className="h-64 rounded-[30px] bg-[#edf4f6]" />
                <div className="h-72 rounded-[28px] bg-[#edf4f6]" />
            </div>
        );
    }

    if (error || !stall) {
        return (
            <div className="mx-auto max-w-xl px-5 py-24 text-center">
                <Store size={42} className="mx-auto text-[#91a9b2]" />
                <h1 className="mt-5 text-3xl font-semibold text-[#173f4f]">
                    This stall isn&apos;t available right now
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#708691]">
                    Please try again or go back to the stall list.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setLoading(true);
                            setRetry((r) => r + 1);
                        }}
                        className="rounded-full bg-[#0b6f8b] px-5 py-3 text-sm font-semibold text-white"
                    >
                        Try again
                    </button>
                    <Link
                        href="/stalls"
                        className="rounded-full border border-[#dce8ed] bg-white px-5 py-3 text-sm font-semibold text-[#1d4c5d]"
                    >
                        All stalls
                    </Link>
                </div>
            </div>
        );
    }

    const mapUrl = stallMapUrl(stall);
    const label = STALL_STATUS[stall.status];
    const productCount = stall.productCount ?? stall.products.length;

    return (
        <div className="mx-auto max-w-[1360px] pb-12 text-[#173f4f]">
            <Link
                href="/stalls"
                className="mb-5 inline-flex items-center gap-2 rounded-full px-1 py-2 text-sm font-semibold text-[#5b7680] transition hover:text-[#173f4f]"
            >
                <ArrowLeft size={18} /> Back to all stalls
            </Link>

            <section className="overflow-hidden rounded-[30px] border border-[#dde9ee] bg-[linear-gradient(135deg,#f1fbfd_0%,#fff8f3_100%)] shadow-[0_18px_48px_rgba(15,67,86,.07)]">
                <div className="grid gap-6 p-6 sm:p-7 xl:grid-cols-[1.1fr_0.9fr] xl:items-center xl:p-8">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold ring-1 ring-inset ${label.className}`}
                            >
                                <span
                                    className={`h-2 w-2 rounded-full ${stall.status === "ongoing" ? "bg-emerald-500" : stall.status === "upcoming" ? "bg-sky-500" : "bg-slate-400"}`}
                                />
                                {label.label}
                            </span>
                            {stall.stallNumber && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#5c7580] ring-1 ring-[#dfebef]">
                                    <Ticket size={13} /> Stall{" "}
                                    {stall.stallNumber}
                                </span>
                            )}
                        </div>
                        <h1 className="mt-4 font-serif text-[clamp(2rem,4vw,3.7rem)] font-semibold leading-[1.08] tracking-tight text-[#153f50]">
                            {stall.name}
                        </h1>
                        {stall.description && (
                            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#617b85] sm:text-base">
                                {stall.description}
                            </p>
                        )}
                        <div className="mt-5 flex flex-wrap gap-3">
                            {mapUrl && (
                                <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#0b6f8b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#085a71]"
                                >
                                    <Navigation size={17} /> Get directions
                                </a>
                            )}
                            {stall.products.length > 0 && (
                                <a
                                    href="#stall-showcase"
                                    className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#cae0e8] bg-white px-5 py-3 text-sm font-semibold text-[#1d4c5d] transition hover:bg-[#f4fbfd]"
                                >
                                    <Sparkles size={17} /> See showcased
                                    products
                                </a>
                            )}
                            <Link
                                href="/products"
                                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#f0ddd2] bg-[#fff8f3] px-5 py-3 text-sm font-semibold text-[#9b5b2f] transition hover:bg-[#fff2e8]"
                            >
                                <ShoppingBag size={17} /> Shop online instead
                            </Link>
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <div className="rounded-[24px] border border-[#dbe9ee] bg-white p-5 shadow-[0_10px_28px_rgba(16,66,86,.05)]">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#79909a]">
                                Visit details
                            </p>
                            <div className="mt-3 space-y-3 text-sm text-[#254b5b]">
                                <p className="flex items-start gap-3">
                                    <CalendarDays
                                        size={18}
                                        className="mt-0.5 shrink-0 text-[#0c7796]"
                                    />
                                    <span>
                                        <strong className="font-semibold">
                                            {formatStallRange(stall)}
                                        </strong>
                                        <br />
                                        <span className="text-xs text-[#718993]">
                                            {stall.dayCount}{" "}
                                            {stall.dayCount === 1
                                                ? "day"
                                                : "days"}
                                        </span>
                                    </span>
                                </p>
                                <p className="flex items-start gap-3">
                                    <Clock3
                                        size={18}
                                        className="mt-0.5 shrink-0 text-[#0c7796]"
                                    />
                                    <span>
                                        <strong className="font-semibold">
                                            {stall.schedule[0]
                                                ? `${formatStallTime(stall.schedule[0].startTime)} – ${formatStallTime(stall.schedule[0].endTime)}`
                                                : "To be announced"}
                                        </strong>
                                        <br />
                                        <span className="text-xs text-[#718993]">
                                            Daily timings listed below
                                        </span>
                                    </span>
                                </p>
                                <p className="flex items-start gap-3">
                                    <MapPin
                                        size={18}
                                        className="mt-0.5 shrink-0 text-[#0c7796]"
                                    />
                                    <span>
                                        <strong className="font-semibold">
                                            {stall.locationName || "Venue"}
                                        </strong>
                                        <br />
                                        <span className="text-xs leading-5 text-[#718993]">
                                            {stall.address ||
                                                "Full address will be shared soon."}
                                        </span>
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="rounded-[24px] border border-[#dbe9ee] bg-white p-5 shadow-[0_10px_28px_rgba(16,66,86,.05)]">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#79909a]">
                                Why customers love visiting
                            </p>
                            <div className="mt-3 space-y-3 text-sm leading-6 text-[#617b85]">
                                <p>• Explore handmade products in person</p>
                                <p>
                                    • See colors, textures, and details up close
                                </p>
                                <p>
                                    • Discover {productCount} showcased design
                                    {productCount === 1 ? "" : "s"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-6 rounded-[28px] border border-[#e3edf1] bg-white p-5 shadow-[0_10px_34px_rgba(14,66,86,.05)] sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0b7896]">
                            Daily timings
                        </p>
                        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#173f4f]">
                            Plan the best time to visit
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#6b838d]">
                            Check the stall schedule before visiting, especially
                            when the stall runs across multiple days.
                        </p>
                    </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {stall.schedule.map((day, index) => (
                        <div
                            key={`${day.date}-${index}`}
                            className="rounded-[22px] border border-[#e5edf0] bg-[#fbfdfe] p-4"
                        >
                            <p className="text-sm font-semibold text-[#214958]">
                                {formatStallDate(day.date, {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                })}
                            </p>
                            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#edf8fb] px-3 py-1.5 text-sm font-semibold text-[#0b7896]">
                                <Clock3 size={15} />{" "}
                                {formatStallTime(day.startTime)} –{" "}
                                {formatStallTime(day.endTime)}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {stall.products.length > 0 && (
                <StallShowcaseGallery
                    products={stall.products}
                    status={stall.status}
                />
            )}

            <section className="mt-8 rounded-[30px] border border-[#eee2d7] bg-[linear-gradient(135deg,#fff7f1_0%,#fffdfb_100%)] px-6 py-7 shadow-[0_14px_34px_rgba(88,58,30,.04)] sm:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ae6a3b]">
                            Can&apos;t visit this stall?
                        </p>
                        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#5a3820] sm:text-3xl">
                            Shop the handmade collection online
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#876b56]">
                            We&apos;d love to meet you at the stall, but if you
                            can&apos;t make it, our website is always open for
                            you.
                        </p>
                    </div>
                    <Link
                        href="/products"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#c9793b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#b7682f]"
                    >
                        <ShoppingBag size={18} /> Browse products
                    </Link>
                </div>
            </section>
        </div>
    );
}