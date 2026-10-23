import Link from "next/link";
import {
    ArrowRight,
    ArrowUpRight,
    CalendarDays,
    Clock3,
    MapPin,
    ShoppingBag,
    Sparkles,
    Store,
    Ticket,
} from "lucide-react";
import type { PublicStall } from "@/types/stall";
import {
    formatStallRange,
    formatStallTime,
    STALL_STATUS,
    stallMapUrl,
} from "@/lib/stalls";
import StallProductImage from "./StallProductImage";

const statusStyles = {
    ongoing: {
        bar: "from-emerald-500 to-teal-500",
        soft: "bg-emerald-50 text-emerald-800 border-emerald-200",
        panel: "bg-[linear-gradient(180deg,#f4fdf8_0%,#ffffff_100%)]",
        accent: "text-emerald-700",
    },
    upcoming: {
        bar: "from-sky-500 to-cyan-500",
        soft: "bg-sky-50 text-sky-800 border-sky-200",
        panel: "bg-[linear-gradient(180deg,#f5fbff_0%,#ffffff_100%)]",
        accent: "text-sky-700",
    },
    completed: {
        bar: "from-slate-400 to-slate-500",
        soft: "bg-slate-100 text-slate-700 border-slate-200",
        panel: "bg-[linear-gradient(180deg,#fafbfc_0%,#ffffff_100%)]",
        accent: "text-slate-700",
    },
} as const;

export default function StallCard({ stall }: { stall: PublicStall }) {
    const firstSession = stall.schedule[0];
    const status = STALL_STATUS[stall.status];
    const style = statusStyles[stall.status];
    const mapUrl = stallMapUrl(stall);
    const preview = stall.products.slice(0, 4);
    const totalProducts = stall.productCount ?? stall.products.length;

    return (
        <article
            className={`group overflow-hidden rounded-[28px] border border-[#dde9ee] ${style.panel} shadow-[0_14px_42px_rgba(14,66,86,.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(14,66,86,.12)]`}
        >
            <div className={`h-1.5 w-full bg-gradient-to-r ${style.bar}`} />
            <div className="grid gap-0 xl:grid-cols-[minmax(0,1.1fr)_360px]">
                <div className="p-5 sm:p-6 lg:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold ${style.soft}`}
                                >
                                    <span
                                        className={`h-2 w-2 rounded-full ${stall.status === "ongoing" ? "bg-emerald-500" : stall.status === "upcoming" ? "bg-sky-500" : "bg-slate-400"}`}
                                    />
                                    {status.label}
                                </span>
                                {stall.stallNumber && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#58717c] ring-1 ring-[#dfebef]">
                                        <Ticket size={13} /> Stall{" "}
                                        {stall.stallNumber}
                                    </span>
                                )}
                            </div>
                            <h3 className="mt-3 text-[1.55rem] font-semibold leading-tight tracking-tight text-[#173f4f] sm:text-[1.8rem]">
                                {stall.name}
                            </h3>
                            {stall.locationName && (
                                <p className="mt-2 inline-flex items-start gap-2 text-sm font-medium text-[#55707b]">
                                    <MapPin
                                        size={16}
                                        className="mt-0.5 shrink-0 text-[#0e7796]"
                                    />
                                    <span>{stall.locationName}</span>
                                </p>
                            )}
                            {stall.description && (
                                <p className="mt-3 max-w-4xl text-sm leading-7 text-[#627b85] sm:text-[15px]">
                                    {stall.description}
                                </p>
                            )}
                        </div>
                        {stall.products.length > 0 && (
                            <div className="hidden rounded-2xl bg-white/90 px-4 py-3 ring-1 ring-[#e3edf1] sm:block">
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0b7896]">
                                    What you'll find
                                </p>
                                <p className="mt-1 text-lg font-semibold text-[#173f4f]">
                                    {totalProducts} designs
                                </p>
                                <p className="mt-1 text-xs text-[#738891]">
                                    A curated handmade showcase
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <div className="rounded-[22px] border border-[#e4ecef] bg-white p-4">
                            <div className="flex items-start gap-3">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#edf8fb] text-[#0c7796]">
                                    <CalendarDays size={18} />
                                </span>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#79909a]">
                                        Dates
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-[#244b5b]">
                                        {formatStallRange(stall)}
                                    </p>
                                    <p className="mt-1 text-xs text-[#728892]">
                                        {stall.dayCount}{" "}
                                        {stall.dayCount === 1 ? "day" : "days"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-[22px] border border-[#e4ecef] bg-white p-4">
                            <div className="flex items-start gap-3">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#edf8fb] text-[#0c7796]">
                                    <Clock3 size={18} />
                                </span>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#79909a]">
                                        Timings
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-[#244b5b]">
                                        {firstSession
                                            ? `${formatStallTime(firstSession.startTime)} – ${formatStallTime(firstSession.endTime)}`
                                            : "To be announced"}
                                    </p>
                                    <p className="mt-1 text-xs text-[#728892]">
                                        {stall.schedule.length > 1
                                            ? "Daily timings available"
                                            : "Visit during these hours"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-[22px] border border-[#e4ecef] bg-white p-4">
                            <div className="flex items-start gap-3">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#edf8fb] text-[#0c7796]">
                                    <Sparkles size={18} />
                                </span>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#79909a]">
                                        Why visit
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-[#244b5b]">
                                        Meet us in person
                                    </p>
                                    <p className="mt-1 text-xs text-[#728892]">
                                        Discover handmade pieces up close
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                            href={`/stalls/${stall.id}`}
                            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#0b6f8b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#085a71]"
                        >
                            View stall details <ArrowRight size={17} />
                        </Link>
                        {mapUrl && (
                            <a
                                href={mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#cae0e8] bg-white px-5 py-3 text-sm font-semibold text-[#1d4c5d] transition hover:bg-[#f4fbfd]"
                            >
                                <MapPin size={17} /> Get directions
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

                <div className="border-t border-[#e5edf0] bg-white/85 p-5 xl:border-l xl:border-t-0 xl:p-6">
                    {preview.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0b7896]">
                                        Showcase preview
                                    </p>
                                    <h4 className="mt-1 text-lg font-semibold text-[#173f4f]">
                                        A taste of what&apos;s waiting
                                    </h4>
                                </div>
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${style.accent} bg-white ring-1 ring-[#e3edf1]`}
                                >
                                    {totalProducts} total
                                </span>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {preview.map((product) => (
                                    <div
                                        key={product.id}
                                        className="min-w-0 rounded-[22px] border border-[#e6eef1] bg-white p-2 shadow-[0_8px_20px_rgba(18,62,80,.04)]"
                                    >
                                        <div className="aspect-square overflow-hidden rounded-[18px] bg-[#f2f9fa]">
                                            <StallProductImage
                                                src={product.image}
                                                alt={product.name}
                                                sizes="160px"
                                            />
                                        </div>
                                        <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-[#325462]">
                                            {product.name}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 rounded-[20px] bg-[linear-gradient(135deg,#eef9fb_0%,#fff8f2_100%)] p-4 ring-1 ring-[#e5edf0]">
                                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#173f4f]">
                                    <Store
                                        size={16}
                                        className="text-[#0d7897]"
                                    />{" "}
                                    Visit the stall for the full collection
                                </p>
                                <p className="mt-1 text-xs leading-5 text-[#6f858e]">
                                    Can&apos;t make it in person? Browse our
                                    online store anytime.
                                </p>
                                <Link
                                    href="/products"
                                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0c7290] hover:underline"
                                >
                                    Explore the website{" "}
                                    <ArrowUpRight size={15} />
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full min-h-[230px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#d7e6eb] bg-[#fbfdfe] px-6 text-center">
                            <Store size={26} className="text-[#9bb1b9]" />
                            <p className="mt-3 text-sm font-semibold text-[#224958]">
                                Product highlights coming soon
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[#7a9099]">
                                We&apos;ll soon share the handmade creations
                                planned for this stall.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}