import Link from "next/link";
import {
    ArrowUpRight,
    CalendarDays,
    Clock3,
    MapPin,
    Ticket,
} from "lucide-react";
import type { PublicStall } from "@/types/stall";
import {
    formatStallDate,
    formatStallRange,
    formatStallTime,
} from "@/lib/stalls";
import StallProductImage from "./StallProductImage";

const statusStyle = {
    ongoing: {
        label: "Happening now",
        badge: "bg-[#e8f8f1] text-[#17734b]",
        dot: "bg-[#21a66d]",
        edge: "bg-[#20a06c]",
    },
    upcoming: {
        label: "Coming soon",
        badge: "bg-[#e8f6fb] text-[#126b87]",
        dot: "bg-[#319bc0]",
        edge: "bg-[#238bb0]",
    },
    completed: {
        label: "Past stall",
        badge: "bg-[#f1f3f4] text-[#697982]",
        dot: "bg-[#9aadb5]",
        edge: "bg-[#9aadb5]",
    },
} as const;

export default function StallCard({ stall }: { stall: PublicStall }) {
    const color = statusStyle[stall.status];
    const firstDay = stall.schedule[0];
    const previews = stall.products.slice(0, 4);
    const dateNumber = stall.startDate?.slice(8, 10) || "--";
    const month = stall.startDate
        ? formatStallDate(stall.startDate, { month: "short" })
        : "TBA";
    return (
        <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[24px] border border-[#e5eaed] bg-white shadow-[0_6px_24px_rgba(17,59,76,.05)] transition duration-200 hover:border-[#b9dbe4] hover:shadow-[0_12px_32px_rgba(17,59,76,.10)]">
            <div
                className={`absolute inset-y-0 left-0 w-[4px] ${color.edge}`}
                aria-hidden
            />
            <div className="flex flex-1 flex-col px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                <div className="flex flex-wrap items-center justify-between gap-2 pl-1">
                    <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold ${color.badge}`}
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${color.dot}`}
                        />{" "}
                        {color.label}
                    </span>
                    {stall.stallNumber && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#6e8189]">
                            <Ticket size={13} /> Stall {stall.stallNumber}
                        </span>
                    )}
                </div>

                <div
                    className={`mt-4 grid min-w-0 gap-4 ${previews.length ? "lg:grid-cols-[minmax(0,1fr)_172px] xl:grid-cols-[minmax(0,1fr)_190px]" : ""}`}
                >
                    <div className="flex min-w-0 flex-col">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-[68px] w-[62px] shrink-0 flex-col items-center justify-center rounded-2xl bg-[#eff8fa] text-[#135874]">
                                <span className="text-[10px] font-bold uppercase tracking-[0.1em]">
                                    {month}
                                </span>
                                <span className="text-[26px] font-extrabold leading-8">
                                    {dateNumber}
                                </span>
                            </div>
                            <div className="min-w-0 pt-0.5">
                                <Link
                                    href={`/stalls/${stall.id}`}
                                    className="block text-lg font-bold leading-snug text-[#173d4c] hover:text-[#087595] sm:text-xl"
                                >
                                    {stall.name}
                                </Link>
                                {(stall.locationName || stall.address) && (
                                    <p className="mt-1.5 flex min-w-0 items-start gap-1.5 text-[13px] leading-5 text-[#6c808a]">
                                        <MapPin
                                            size={14}
                                            className="mt-0.5 shrink-0 text-[#3686a1]"
                                        />
                                        <span className="line-clamp-2">
                                            {stall.locationName ||
                                                stall.address}
                                        </span>
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2.5 text-[13px] text-[#506e7a]">
                            <span className="inline-flex items-center gap-1.5">
                                <CalendarDays
                                    size={15}
                                    className="shrink-0 text-[#3d8ba4]"
                                />{" "}
                                <strong className="font-semibold text-[#234a58]">
                                    {formatStallRange(stall)}
                                </strong>
                            </span>
                            {firstDay && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock3
                                        size={15}
                                        className="shrink-0 text-[#3d8ba4]"
                                    />
                                    <span className="font-medium">
                                        {formatStallTime(firstDay.startTime)} –{" "}
                                        {formatStallTime(firstDay.endTime)}
                                    </span>
                                </span>
                            )}
                        </div>
                        <p className="mt-2 text-xs text-[#84969d]">
                            {stall.dayCount}{" "}
                            {stall.dayCount === 1 ? "day" : "days"}
                            {stall.schedule.length > 1
                                ? " · Daily timings in details"
                                : ""}
                        </p>

                        {stall.description && (
                            <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-[#71858e]">
                                {stall.description}
                            </p>
                        )}
                        {stall.address && stall.locationName && (
                            <p className="mt-1.5 line-clamp-1 text-xs text-[#82949c]">
                                {stall.address}
                            </p>
                        )}
                    </div>

                    {previews.length > 0 && (
                        <div className="min-w-0 rounded-2xl bg-[#f7fafb] p-3 lg:self-start">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-[#456777]">
                                    Product preview
                                </span>
                                {(stall.productCount ?? previews.length) >
                                    previews.length && (
                                    <span className="text-[11px] font-semibold text-[#1182a0]">
                                        +
                                        {(stall.productCount ??
                                            previews.length) - previews.length}
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
                                {previews.map((product) => (
                                    <div
                                        key={product.id}
                                        className="group aspect-square min-w-0 overflow-hidden rounded-xl border border-[#e6ebee] bg-white"
                                        title={product.name}
                                    >
                                        <StallProductImage
                                            src={product.image}
                                            alt={product.name}
                                            sizes="90px"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#eff2f3] pt-3.5 sm:mt-4">
                    <p className="hidden text-xs text-[#8b9ca2] sm:block">
                        {stall.status === "completed"
                            ? "Explore this past event"
                            : "See everything before you visit"}
                    </p>
                    <Link
                        href={`/stalls/${stall.id}`}
                        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0d6884] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#07526a] sm:ml-auto sm:w-auto"
                    >
                        View stall <ArrowUpRight size={16} />
                    </Link>
                </div>
            </div>
        </article>
    );
}