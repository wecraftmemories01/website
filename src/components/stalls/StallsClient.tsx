"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowRight,
    CalendarDays,
    MapPin,
    Search,
    ShoppingBag,
    Sparkles,
    Store,
    X,
} from "lucide-react";
import { fetchPublicStalls } from "@/lib/stalls";
import type { PublicStall, StallStatus } from "@/types/stall";
import StallCard from "./StallCard";

type Filter = "all" | StallStatus;
const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All stalls" },
    { value: "ongoing", label: "Ongoing" },
    { value: "upcoming", label: "Upcoming" },
    { value: "completed", label: "Past stalls" },
];

const sectionText: Record<StallStatus, { title: string; note: string }> = {
    ongoing: {
        title: "Visit us today",
        note: "These stalls are currently active.",
    },
    upcoming: {
        title: "Plan your next visit",
        note: "Save the dates and come meet us in person.",
    },
    completed: {
        title: "Stalls we loved",
        note: "A look back at our previous pop-ups and exhibitions.",
    },
};

export default function StallsClient() {
    const [stalls, setStalls] = useState<PublicStall[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    const [activeFilter, setActiveFilter] = useState<Filter>("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        fetchPublicStalls(controller.signal)
            .then((data) => {
                setStalls(data);
                setError(false);
            })
            .catch(() => {
                if (!controller.signal.aborted) setError(true);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [retry]);

    const counts = useMemo(
        () => ({
            all: stalls.length,
            ongoing: stalls.filter((s) => s.status === "ongoing").length,
            upcoming: stalls.filter((s) => s.status === "upcoming").length,
            completed: stalls.filter((s) => s.status === "completed").length,
        }),
        [stalls],
    );

    const visible = useMemo(() => {
        const q = search.trim().toLocaleLowerCase();
        const priority: Record<StallStatus, number> = {
            ongoing: 0,
            upcoming: 1,
            completed: 2,
        };
        return stalls
            .filter(
                (stall) =>
                    (activeFilter === "all" || stall.status === activeFilter) &&
                    (!q ||
                        [
                            stall.name,
                            stall.stallNumber,
                            stall.locationName,
                            stall.address,
                            stall.description,
                            ...stall.products.map((p) => p.name),
                        ]
                            .join(" ")
                            .toLocaleLowerCase()
                            .includes(q)),
            )
            .sort(
                (a, b) =>
                    priority[a.status] - priority[b.status] ||
                    (a.status === "completed"
                        ? b.endDate.localeCompare(a.endDate)
                        : a.startDate.localeCompare(b.startDate)) ||
                    a.name.localeCompare(b.name),
            );
    }, [stalls, activeFilter, search]);

    const sections = useMemo(
        () =>
            (["ongoing", "upcoming", "completed"] as StallStatus[])
                .map((status) => ({
                    status,
                    stalls: visible.filter((stall) => stall.status === status),
                }))
                .filter((section) => section.stalls.length > 0),
        [visible],
    );

    const highlighted =
        stalls.find((s) => s.status === "ongoing") ||
        stalls.find((s) => s.status === "upcoming");

    return (
        <div className="mx-auto max-w-[1440px] pb-12 text-[#173f4f]">
            <section className="mb-6 overflow-hidden rounded-[30px] border border-[#dde9ee] bg-[linear-gradient(135deg,#f1fbfd_0%,#fff8f3_100%)] shadow-[0_18px_48px_rgba(15,67,86,.07)]">
                <div className="grid gap-6 px-5 py-5 sm:px-7 sm:py-7 xl:grid-cols-[1.2fr_0.8fr] xl:items-center xl:px-8">
                    <div>
                        <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0c7796] ring-1 ring-[#d9e8ee]">
                            <Store size={14} /> Meet We Craft Memories in person
                        </p>
                        <h1 className="mt-4 font-serif text-[clamp(1.9rem,4vw,3.6rem)] font-semibold leading-[1.08] tracking-tight text-[#153f50]">
                            Visit our stalls, explore handmade treasures, and
                            shop online if you can&apos;t make it.
                        </h1>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#617b85] sm:text-base">
                            Discover ongoing, upcoming, and past stalls with all
                            the details you need — dates, timings, venue, stall
                            number, and a preview of the handmade products
                            we&apos;re showcasing.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <a
                                href="#stall-directory"
                                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#0b6f8b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#085a71]"
                            >
                                Explore stalls <ArrowRight size={17} />
                            </a>
                            <Link
                                href="/products"
                                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#f0ddd2] bg-[#fff8f2] px-6 py-3 text-sm font-semibold text-[#9b5b2f] transition hover:bg-[#fff1e5]"
                            >
                                <ShoppingBag size={17} /> Shop online
                            </Link>
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                        <div className="rounded-[24px] border border-[#dbe9ee] bg-white p-4 shadow-[0_10px_28px_rgba(16,66,86,.05)]">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7b9199]">
                                Happening now
                            </p>
                            <p className="mt-2 text-3xl font-semibold text-[#173f4f]">
                                {counts.ongoing}
                            </p>
                            <p className="mt-1 text-sm text-[#6d848d]">
                                Stalls you can visit right away
                            </p>
                        </div>
                        <div className="rounded-[24px] border border-[#dbe9ee] bg-white p-4 shadow-[0_10px_28px_rgba(16,66,86,.05)]">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7b9199]">
                                Coming up
                            </p>
                            <p className="mt-2 text-3xl font-semibold text-[#173f4f]">
                                {counts.upcoming}
                            </p>
                            <p className="mt-1 text-sm text-[#6d848d]">
                                Upcoming pop-ups to plan for
                            </p>
                        </div>
                        <div className="rounded-[24px] border border-[#dbe9ee] bg-white p-4 shadow-[0_10px_28px_rgba(16,66,86,.05)]">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7b9199]">
                                Why visit
                            </p>
                            <p className="mt-2 text-lg font-semibold text-[#173f4f]">
                                Handmade joy, in person
                            </p>
                            <p className="mt-1 text-sm text-[#6d848d]">
                                See textures, colors, and details up close.
                            </p>
                        </div>
                    </div>
                </div>
                {highlighted && (
                    <div className="border-t border-[#e5eef1] bg-white/70 px-5 py-4 sm:px-7 xl:px-8">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0b7896]">
                                    <Sparkles size={14} /> Featured stall
                                </p>
                                <p className="mt-1 truncate text-base font-semibold text-[#173f4f]">
                                    {highlighted.name}
                                </p>
                                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#66808a]">
                                    <span className="inline-flex items-center gap-1.5">
                                        <CalendarDays size={15} />{" "}
                                        {highlighted.startDate ===
                                        highlighted.endDate
                                            ? highlighted.startDate
                                            : `${highlighted.startDate} to ${highlighted.endDate}`}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <MapPin size={15} />{" "}
                                        {highlighted.locationName ||
                                            "Venue details available"}
                                    </span>
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href={`/stalls/${highlighted.id}`}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0b6f8b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#085a71]"
                                >
                                    View details <ArrowRight size={16} />
                                </Link>
                                <Link
                                    href="/products"
                                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#e2eaee] bg-white px-5 py-2.5 text-sm font-semibold text-[#1d4c5d] transition hover:bg-[#f8fbfc]"
                                >
                                    Browse products
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <section
                id="stall-directory"
                className="scroll-mt-28 rounded-[28px] border border-[#e3edf1] bg-white p-4 shadow-[0_10px_34px_rgba(14,66,86,.05)] sm:p-5 lg:p-6"
            >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0b7896]">
                            Stall directory
                        </p>
                        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#173f4f] sm:text-3xl">
                            Find the perfect stall to visit
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#6b838d]">
                            Ongoing stalls are shown first, followed by upcoming
                            plans and then past events.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 lg:w-[420px]">
                        <div
                            role="group"
                            aria-label="Stall status filter"
                            className="flex flex-wrap gap-2"
                        >
                            {filters.map((tab) => {
                                const selected = activeFilter === tab.value;
                                return (
                                    <button
                                        type="button"
                                        key={tab.value}
                                        onClick={() =>
                                            setActiveFilter(tab.value)
                                        }
                                        aria-pressed={selected}
                                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${selected ? "bg-[#0b6f8b] text-white shadow-[0_8px_24px_rgba(11,111,139,.18)]" : "border border-[#dce8ed] bg-[#f8fbfc] text-[#57727d] hover:bg-white"}`}
                                    >
                                        {tab.label}
                                        {!loading && !error && (
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[11px] ${selected ? "bg-white/20" : "bg-white text-[#69808a] ring-1 ring-[#dfe9ee]"}`}
                                            >
                                                {counts[tab.value]}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="relative">
                            <Search
                                size={18}
                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8ca2aa]"
                            />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search by stall, location, or product..."
                                aria-label="Search stalls"
                                className="min-h-12 w-full rounded-2xl border border-[#dfe8ec] bg-[#fbfdfe] py-3 pl-11 pr-10 text-sm outline-none transition focus:border-[#77b8cb] focus:ring-2 focus:ring-[#d6ecf2]"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    aria-label="Clear search"
                                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#839aa3] hover:bg-[#edf7fa]"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div
                        className="mt-6 space-y-4"
                        role="status"
                        aria-label="Loading stalls"
                    >
                        {[0, 1].map((item) => (
                            <div
                                key={item}
                                className="h-[380px] animate-pulse rounded-[28px] bg-[#edf4f6]"
                            />
                        ))}
                    </div>
                ) : error ? (
                    <div className="mt-6 rounded-[24px] border border-[#e5ecef] bg-[#fbfdfe] px-6 py-12 text-center">
                        <p className="text-lg font-semibold text-[#173f4f]">
                            We couldn&apos;t load the stalls right now
                        </p>
                        <p className="mt-2 text-sm text-[#708691]">
                            Please try again in a moment.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setLoading(true);
                                setRetry((n) => n + 1);
                            }}
                            className="mt-4 rounded-full bg-[#0b6f8b] px-5 py-3 text-sm font-semibold text-white"
                        >
                            Try again
                        </button>
                    </div>
                ) : sections.length === 0 ? (
                    <div className="mt-6 rounded-[24px] border border-[#e5ecef] bg-[#fbfdfe] px-6 py-12 text-center">
                        <MapPin className="mx-auto text-[#98aeb6]" size={30} />
                        <h3 className="mt-4 text-xl font-semibold text-[#173f4f]">
                            No matching stalls found
                        </h3>
                        <p className="mt-2 text-sm text-[#708691]">
                            Try another search term or switch back to All
                            stalls.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveFilter("all");
                                setSearch("");
                            }}
                            className="mt-4 rounded-full border border-[#dbe7eb] bg-white px-5 py-3 text-sm font-semibold text-[#1d4c5d]"
                        >
                            Show all stalls
                        </button>
                    </div>
                ) : (
                    <div className="mt-8 space-y-9">
                        {sections.map((section) => (
                            <section
                                key={section.status}
                                aria-labelledby={`stall-section-${section.status}`}
                            >
                                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                                    <div>
                                        <h3
                                            id={`stall-section-${section.status}`}
                                            className="text-2xl font-semibold tracking-tight text-[#173f4f]"
                                        >
                                            {sectionText[section.status].title}
                                        </h3>
                                        <p className="mt-1 text-sm text-[#6a838d]">
                                            {sectionText[section.status].note}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-[#eef7fa] px-3 py-1.5 text-sm font-semibold text-[#0b7896]">
                                        {section.stalls.length}{" "}
                                        {section.stalls.length === 1
                                            ? "stall"
                                            : "stalls"}
                                    </span>
                                </div>
                                <div className="space-y-5">
                                    {section.stalls.map((stall) => (
                                        <StallCard
                                            key={stall.id}
                                            stall={stall}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </section>

            <section className="mt-8 rounded-[30px] border border-[#eee2d7] bg-[linear-gradient(135deg,#fff7f1_0%,#fffdfb_100%)] px-6 py-7 shadow-[0_14px_34px_rgba(88,58,30,.04)] sm:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ae6a3b]">
                            Can&apos;t make it to the stall?
                        </p>
                        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#5a3820] sm:text-3xl">
                            Take the handmade experience home from our website
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#876b56]">
                            Browse beautiful handmade products online anytime —
                            perfect when you can&apos;t visit us in person.
                        </p>
                    </div>
                    <Link
                        href="/products"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#c9793b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#b7682f]"
                    >
                        <ShoppingBag size={18} /> Shop the collection
                    </Link>
                </div>
            </section>
        </div>
    );
}