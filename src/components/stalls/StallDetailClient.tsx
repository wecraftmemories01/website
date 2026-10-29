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
} from "@/lib/stalls";
import StallShowcaseGallery from "./StallShowcaseGallery";
import StallProductImage from "./StallProductImage";
import ShareMenu from "@/components/ui/ShareMenu";

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

    if (loading)
        return (
            <div
                role="status"
                aria-label="Loading stall details"
                className="mx-auto max-w-[1400px] animate-pulse space-y-4 py-4"
            >
                <div className="h-7 w-32 rounded-lg bg-[#eaf1ef]" />
                <div className="h-[290px] rounded-[26px] bg-[#eaf1ef]" />
                <div className="h-40 rounded-[26px] bg-[#eaf1ef]" />
            </div>
        );
    if (error || !stall)
        return (
            <div className="mx-auto max-w-xl px-4 py-20 text-center">
                <Store size={36} className="mx-auto text-[#9aafb0]" />
                <h1 className="mt-4 text-2xl font-bold text-[#173e46]">
                    Stall details aren&apos;t available
                </h1>
                <p className="mt-2 text-sm text-[#6c8084]">
                    Please try again or explore the other stalls.
                </p>
                <div className="mt-5 flex justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setLoading(true);
                            setRetry((r) => r + 1);
                        }}
                        className="rounded-xl bg-[#087b86] px-4 py-2.5 text-sm font-bold text-white"
                    >
                        Try again
                    </button>
                    <Link
                        href="/stalls"
                        className="rounded-xl border border-[#d6e4e2] px-4 py-2.5 text-sm font-bold text-[#245f65]"
                    >
                        All stalls
                    </Link>
                </div>
            </div>
        );

    const mapUrl = stallMapUrl(stall);
    const count = stall.productCount ?? stall.products.length;
    const first = stall.schedule[0];
    const status =
        stall.status === "ongoing"
            ? {
                  label: "Happening today",
                  cls: "bg-emerald-50 text-emerald-800 ring-emerald-200",
                  dot: "bg-emerald-500 animate-pulse",
              }
            : stall.status === "upcoming"
              ? {
                    label: "Coming soon",
                    cls: "bg-sky-50 text-sky-800 ring-sky-200",
                    dot: "bg-sky-500",
                }
              : {
                    label: "Past event",
                    cls: "bg-stone-100 text-stone-700 ring-stone-200",
                    dot: "bg-stone-400",
                };
    const highlightImages = stall.products.slice(0, 3);

    return (
        <div className="mx-auto max-w-[1400px] pb-24 text-[#173e46] sm:pb-10">
            <Link
                href="/stalls"
                className="mb-3 inline-flex min-h-9 items-center gap-1.5 text-[13px] font-bold text-[#6b7e81] transition hover:text-[#087b86]"
            >
                <ArrowLeft size={15} /> All stalls
            </Link>

            <section className="overflow-hidden rounded-[25px] border border-[#e0eae6] bg-white shadow-[0_14px_42px_rgba(25,60,62,.06)]">
                <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="min-w-0 px-4 pb-4 pt-5 sm:px-7 sm:pb-6 sm:pt-7 lg:px-8">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-extrabold ring-1 ring-inset ${status.cls}`}
                            >
                                <span
                                    className={`h-2 w-2 rounded-full ${status.dot}`}
                                />
                                {status.label}
                            </span>
                            {stall.stallNumber && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f6f4] px-3 py-1.5 text-xs font-bold text-[#617277]">
                                    <Ticket size={14} /> Stall{" "}
                                    {stall.stallNumber}
                                </span>
                            )}
                        </div>
                        <h1 className="mt-3 max-w-4xl text-[clamp(1.75rem,3.5vw,3.2rem)] font-extrabold leading-[1.1] tracking-[-.055em] text-[#173d44]">
                            {stall.name}
                        </h1>
                        {stall.description && (
                            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#657b7e] sm:text-sm">
                                {stall.description}
                            </p>
                        )}
                        <div className="mt-4 flex flex-wrap items-start gap-x-6 gap-y-3 rounded-[18px] bg-[#f6faf8] px-4 py-3.5">
                            <div className="flex items-start gap-2.5">
                                <CalendarDays
                                    size={19}
                                    className="mt-0.5 shrink-0 text-[#b9724d]"
                                />
                                <span className="text-[13px]">
                                    <span className="block text-[11px] font-bold uppercase tracking-wide text-[#849496]">
                                        Dates
                                    </span>
                                    <strong className="mt-0.5 block font-extrabold text-[#2b4950]">
                                        {formatStallRange(stall)}
                                    </strong>
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <Clock3
                                    size={19}
                                    className="mt-0.5 shrink-0 text-[#b9724d]"
                                />
                                <span className="text-[13px]">
                                    <span className="block text-[11px] font-bold uppercase tracking-wide text-[#849496]">
                                        Opening hours
                                    </span>
                                    <strong className="mt-0.5 block font-extrabold text-[#2b4950]">
                                        {first
                                            ? `${formatStallTime(first.startTime)} – ${formatStallTime(first.endTime)}`
                                            : "To be announced"}
                                    </strong>
                                    <span className="block text-[11px] text-[#829396]">
                                        All daily timings below
                                    </span>
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            {mapUrl && (
                                <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#087b86] px-5 py-2.5 text-[13px] font-extrabold text-white transition hover:bg-[#05636b]"
                                >
                                    <Navigation size={17} /> Get directions{" "}
                                    <ArrowRight size={15} />
                                </a>
                            )}
                            {stall.products.length > 0 && (
                                <a
                                    href="#stall-showcase"
                                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#c9dfde] bg-white px-4 py-2.5 text-[13px] font-bold text-[#28626c] hover:bg-[#f2faf8]"
                                >
                                    <Sparkles size={16} /> See {count} designs
                                </a>
                            )}
                            <Link
                                href="/products"
                                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#f0dbce] bg-[#fff9f4] px-4 py-2.5 text-[13px] font-bold text-[#a9633c] hover:bg-[#fff0e5]"
                            >
                                <ShoppingBag size={16} /> Shop online
                            </Link>
                            <ShareMenu
                                kind="stall"
                                title={stall.name}
                                path={`/stalls/${encodeURIComponent(stall.slug || stallId)}`}
                                description={[
                                    stall.locationName || stall.address,
                                    formatStallRange(stall),
                                ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                className="min-h-11"
                            />
                        </div>
                    </div>
                    <aside className="flex min-w-0 flex-col justify-between border-t border-[#ecede6] bg-[linear-gradient(145deg,#fff6ed,#f2faf8)] px-4 py-4 sm:px-7 xl:border-l xl:border-t-0 xl:px-5 xl:py-6">
                        <div>
                            <span className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#a56743]">
                                Where to find us
                            </span>
                            <div className="mt-2 flex items-start gap-2.5">
                                <MapPin
                                    className="mt-1 shrink-0 text-[#a96040]"
                                    size={21}
                                />
                                <div>
                                    <p className="text-[17px] font-extrabold leading-6 text-[#26454a]">
                                        {stall.locationName ||
                                            "Venue to be announced"}
                                    </p>
                                    {stall.address && (
                                        <p className="mt-1 text-[13px] leading-5 text-[#697f7f]">
                                            {stall.address}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {mapUrl && (
                                <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-[13px] font-extrabold text-[#087b86] hover:underline"
                                >
                                    Open in Google Maps <ArrowRight size={14} />
                                </a>
                            )}
                        </div>
                        {highlightImages.length > 0 && (
                            <a
                                href="#stall-showcase"
                                className="mt-4 grid h-[86px] grid-cols-3 gap-2 xl:mt-6 xl:h-[116px]"
                                aria-label="Explore handmade designs in this stall"
                            >
                                {highlightImages.map((product) => (
                                    <div
                                        key={product.id}
                                        className="overflow-hidden rounded-xl border border-white bg-white shadow-sm"
                                    >
                                        <StallProductImage
                                            src={product.image}
                                            alt={product.name}
                                            sizes="120px"
                                        />
                                    </div>
                                ))}
                            </a>
                        )}
                    </aside>
                </div>
                <div className="border-t border-[#e7ece9] bg-[#fbfdfc] px-4 py-4 sm:px-7 sm:py-5 lg:px-8">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="inline-flex items-center gap-2 text-base font-extrabold tracking-tight text-[#24474e]">
                            <Clock3 className="text-[#b9724d]" size={18} />{" "}
                            Daily opening hours
                        </h2>
                        <span className="text-xs text-[#71898b]">
                            All {stall.schedule.length || stall.dayCount}{" "}
                            {stall.schedule.length === 1 ? "date" : "dates"}{" "}
                            shown
                        </span>
                    </div>
                    {stall.schedule.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                            {stall.schedule.map((day, index) => (
                                <div
                                    key={`${day.date}-${index}`}
                                    className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-[#e2e9e5] bg-white px-3.5 py-3"
                                >
                                    <span className="min-w-0 text-[13px] font-extrabold text-[#26484d]">
                                        {formatStallDate(day.date, {
                                            weekday: "short",
                                            day: "numeric",
                                            month: "short",
                                        })}
                                    </span>
                                    <span className="shrink-0 text-[12px] font-bold text-[#087b86]">
                                        {formatStallTime(day.startTime)} –{" "}
                                        {formatStallTime(day.endTime)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[13px] text-[#74898b]">
                            Daily opening hours will be shared soon.
                        </p>
                    )}
                </div>
            </section>

            {stall.products.length > 0 && (
                <StallShowcaseGallery
                    products={stall.products}
                    status={stall.status}
                />
            )}

            <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-[22px] border border-[#eadcce] bg-[linear-gradient(100deg,#fff7ed,#f9faf6)] px-5 py-5 sm:flex-row sm:items-center sm:px-7">
                <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-[#714d39]">
                        Can&apos;t make it in person?
                    </h2>
                    <p className="mt-1 text-[13px] text-[#806b5b]">
                        The handmade collection is just a click away.
                    </p>
                </div>
                <Link
                    href="/products"
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#bf764a] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#a9643b]"
                >
                    <ShoppingBag size={16} /> Shop all products{" "}
                    <ArrowRight size={15} />
                </Link>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-[#dce9e6] bg-white/95 px-4 py-2.5 shadow-[0_-10px_30px_rgba(20,67,70,.09)] backdrop-blur-lg sm:hidden">
                {mapUrl && (
                    <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#087b86] px-2 text-[13px] font-bold text-white"
                    >
                        <Navigation size={16} /> Directions
                    </a>
                )}
                {stall.products.length > 0 && (
                    <a
                        href="#stall-showcase"
                        className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#cfe2df] bg-[#f5faf8] px-2 text-[13px] font-bold text-[#28616b]"
                    >
                        <Sparkles size={16} /> View products
                    </a>
                )}
                {(!mapUrl || stall.products.length === 0) && (
                    <Link
                        href="/products"
                        className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#f0dccb] bg-[#fff7ee] px-2 text-[13px] font-bold text-[#a5633e]"
                    >
                        <ShoppingBag size={16} /> Shop online
                    </Link>
                )}
            </div>
        </div>
    );
}