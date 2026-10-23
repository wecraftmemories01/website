import Link from "next/link";
import {
    ArrowRight,
    CalendarDays,
    Clock3,
    MapPin,
    Navigation,
    ShoppingBag,
    Ticket,
} from "lucide-react";
import type { PublicStall } from "@/types/stall";
import { formatStallRange, formatStallTime, stallMapUrl } from "@/lib/stalls";
import StallProductImage from "./StallProductImage";

const styles = {
    ongoing: {
        label: "Happening today",
        badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
        dot: "bg-emerald-500",
        accent: "border-emerald-300",
    },
    upcoming: {
        label: "Coming up",
        badge: "bg-sky-50 text-sky-800 ring-sky-200",
        dot: "bg-sky-500",
        accent: "border-sky-200",
    },
    completed: {
        label: "Past event",
        badge: "bg-stone-100 text-stone-700 ring-stone-200",
        dot: "bg-stone-400",
        accent: "border-stone-200",
    },
} as const;

export default function StallCard({ stall }: { stall: PublicStall }) {
    const style = styles[stall.status];
    const directions = stallMapUrl(stall);
    const images = stall.products.slice(0, 3);
    const count = stall.productCount ?? stall.products.length;
    const hours = stall.schedule[0]
        ? `${formatStallTime(stall.schedule[0].startTime)} – ${formatStallTime(stall.schedule[0].endTime)}`
        : null;
    const varyingHours = stall.schedule.some(
        (day) =>
            day.startTime !== stall.schedule[0]?.startTime ||
            day.endTime !== stall.schedule[0]?.endTime,
    );

    return (
        <article
            className={`group overflow-hidden rounded-[24px] border bg-white shadow-[0_10px_30px_rgba(19,62,75,.055)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(19,62,75,.1)] ${style.accent}`}
        >
            <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_240px] xl:grid-cols-[minmax(0,1fr)_285px]">
                <div className="min-w-0 px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-extrabold ring-1 ring-inset ${style.badge}`}
                        >
                            <span
                                className={`h-2 w-2 rounded-full ${style.dot} ${stall.status === "ongoing" ? "animate-pulse" : ""}`}
                            />
                            {style.label}
                        </span>
                        {stall.stallNumber && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f7f6] px-3 py-1 text-xs font-bold text-[#54666a]">
                                <Ticket size={13} /> Stall {stall.stallNumber}
                            </span>
                        )}
                    </div>
                    <div className="mt-3">
                        <Link
                            href={`/stalls/${stall.id}`}
                            className="inline-block max-w-full text-[clamp(1.3rem,2vw,1.75rem)] font-extrabold leading-tight tracking-[-.035em] text-[#173f47] hover:text-[#007f8c]"
                        >
                            {stall.name}
                        </Link>
                        {stall.description && (
                            <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-[#667981]">
                                {stall.description}
                            </p>
                        )}
                    </div>
                    <div className="mt-4 grid gap-x-5 gap-y-2 border-t border-[#edf1ef] pt-3 sm:grid-cols-2 xl:grid-cols-3">
                        <p className="flex items-start gap-2 text-[13px] leading-5 text-[#405b61]">
                            <CalendarDays
                                className="mt-0.5 shrink-0 text-[#c57149]"
                                size={16}
                            />
                            <span>
                                <strong className="block font-bold text-[#203f47]">
                                    {formatStallRange(stall)}
                                </strong>
                                <span className="text-xs text-[#70848a]">
                                    {stall.dayCount}{" "}
                                    {stall.dayCount === 1 ? "day" : "days"}
                                </span>
                            </span>
                        </p>
                        <p className="flex items-start gap-2 text-[13px] leading-5 text-[#405b61]">
                            <Clock3
                                className="mt-0.5 shrink-0 text-[#c57149]"
                                size={16}
                            />
                            <span>
                                <strong className="block font-bold text-[#203f47]">
                                    {hours || "Timings to be announced"}
                                </strong>
                                <span className="text-xs text-[#70848a]">
                                    {varyingHours
                                        ? "Hours vary by date"
                                        : "Daily opening hours"}
                                </span>
                            </span>
                        </p>
                        <p className="flex items-start gap-2 text-[13px] leading-5 text-[#405b61] sm:col-span-2 xl:col-span-1">
                            <MapPin
                                className="mt-0.5 shrink-0 text-[#c57149]"
                                size={16}
                            />
                            <span>
                                <strong className="block font-bold text-[#203f47]">
                                    {stall.locationName ||
                                        "Location to be announced"}
                                </strong>
                                {stall.address && (
                                    <span className="line-clamp-1 text-xs text-[#70848a]">
                                        {stall.address}
                                    </span>
                                )}
                            </span>
                        </p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Link
                            href={`/stalls/${stall.id}`}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#087b86] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#05616b]"
                        >
                            Visit details <ArrowRight size={16} />
                        </Link>
                        {directions && (
                            <a
                                href={directions}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#cfe1df] bg-white px-3.5 py-2 text-[13px] font-bold text-[#27616a] transition hover:bg-[#f0faf8]"
                            >
                                <Navigation size={15} /> Directions
                            </a>
                        )}
                        <Link
                            href="/products"
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[13px] font-semibold text-[#a85e37] hover:bg-[#fff5ed]"
                        >
                            <ShoppingBag size={15} /> Shop online
                        </Link>
                    </div>
                </div>
                {images.length > 0 && (
                    <Link
                        href={`/stalls/${stall.id}#stall-showcase`}
                        aria-label={`See ${stall.name} showcase`}
                        className="relative flex min-h-[110px] items-center gap-2 overflow-hidden border-t border-[#edf1ef] bg-[#f9f5ef] p-2.5 lg:h-full lg:min-h-[235px] lg:border-l lg:border-t-0"
                    >
                        <div className="grid h-[106px] w-full grid-cols-3 gap-2 lg:h-full lg:max-h-[235px]">
                            {images.map((product) => (
                                <div
                                    key={product.id}
                                    className="min-w-0 overflow-hidden rounded-xl bg-white"
                                >
                                    <StallProductImage
                                        src={product.image}
                                        alt={product.name}
                                        sizes="(max-width: 1024px) 30vw, 110px"
                                    />
                                </div>
                            ))}
                            {images.length === 1 && (
                                <div className="col-span-2 flex items-center justify-center rounded-xl bg-white/75 px-3 text-center text-xs font-semibold text-[#647579]">
                                    Handmade with care
                                </div>
                            )}
                        </div>
                        {count > 0 && (
                            <span className="absolute bottom-4 right-4 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-[#26646b] shadow-sm">
                                Explore {count}{" "}
                                {count === 1 ? "design" : "designs"}{" "}
                                <ArrowRight size={12} className="inline" />
                            </span>
                        )}
                    </Link>
                )}
            </div>
        </article>
    );
}