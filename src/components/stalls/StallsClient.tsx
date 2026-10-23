"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowRight,
    MapPin,
    Search,
    ShoppingBag,
    Store,
    X,
} from "lucide-react";
import { fetchPublicStalls } from "@/lib/stalls";
import type { PublicStall, StallStatus } from "@/types/stall";
import StallCard from "./StallCard";

type Filter = "all" | StallStatus;
const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "ongoing", label: "Happening now" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Past" },
];
const sections: { key: StallStatus; title: string; description: string }[] = [
    {
        key: "ongoing",
        title: "Happening now",
        description: "Come meet us at these stalls",
    },
    {
        key: "upcoming",
        title: "Coming up next",
        description: "Save the date for your next visit",
    },
    {
        key: "completed",
        title: "Our past pop-ups",
        description: "A little look back at where we've been",
    },
];

export default function StallsClient() {
    const [stalls, setStalls] = useState<PublicStall[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    const [filter, setFilter] = useState<Filter>("all");
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
        return stalls.filter(
            (stall) =>
                (filter === "all" || stall.status === filter) &&
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
        );
    }, [stalls, filter, search]);

    const groups = useMemo(
        () =>
            sections
                .map((section) => ({
                    ...section,
                    items: visible
                        .filter((s) => s.status === section.key)
                        .sort((a, b) =>
                            section.key === "completed"
                                ? b.endDate.localeCompare(a.endDate)
                                : a.startDate.localeCompare(b.startDate),
                        ),
                }))
                .filter((s) => s.items.length > 0),
        [visible],
    );

    return (
        <div className="mx-auto max-w-[1400px] pb-10 text-[#183e46]">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.17em] text-[#af6c47]">
                        <span className="h-2 w-2 rounded-full bg-[#d78a55]" />{" "}
                        Meet We Craft Memories
                    </div>
                    <h1 className="text-[clamp(1.8rem,3.3vw,2.9rem)] font-extrabold leading-[1.08] tracking-[-.055em] text-[#173e46]">
                        Find us at our stalls{" "}
                        <span className="text-[#c1744b]">♡</span>
                    </h1>
                    <p className="mt-1.5 text-[13px] leading-6 text-[#667b80] sm:text-sm">
                        Discover where we&apos;re popping up, when to visit and
                        what we&apos;re bringing.
                    </p>
                </div>
                <Link
                    href="/products"
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-[#e8d5c5] bg-[#fff7ef] px-4 py-2.5 text-sm font-bold text-[#a45c35] transition hover:border-[#d7a985] hover:bg-[#fff0df] sm:self-center"
                >
                    <ShoppingBag size={17} /> Can&apos;t visit? Shop online{" "}
                    <ArrowRight size={15} />
                </Link>
            </div>

            <div className="sticky top-14 z-20 mb-5 rounded-[20px] border border-[#e1eae8] bg-white/95 p-2.5 shadow-[0_8px_26px_rgba(20,61,72,.075)] backdrop-blur-xl sm:p-3">
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                    <div
                        role="group"
                        aria-label="Filter stalls"
                        className="flex min-w-0 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {filters.map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setFilter(key)}
                                aria-pressed={filter === key}
                                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold transition sm:px-4 ${filter === key ? "bg-[#097c86] text-white shadow-[0_3px_9px_rgba(9,124,134,.16)]" : "bg-[#f3f8f7] text-[#557178] hover:bg-[#e6f4f2]"}`}
                            >
                                {label}
                                {!loading && !error && (
                                    <span
                                        className={`rounded-md px-1.5 py-0.5 text-[11px] ${filter === key ? "bg-white/20" : "bg-white text-[#6f8488]"}`}
                                    >
                                        {counts[key]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full lg:max-w-[310px]">
                        <Search
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8da1a3]"
                            size={17}
                        />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search stall, place or product"
                            aria-label="Search stalls"
                            className="min-h-10 w-full rounded-xl border border-[#e1e9e8] bg-[#fbfcfc] py-2 pl-9 pr-9 text-[13px] text-[#173e46] outline-none focus:border-[#69b7b7] focus:ring-2 focus:ring-[#d9efed]"
                        />
                        {search && (
                            <button
                                type="button"
                                aria-label="Clear search"
                                onClick={() => setSearch("")}
                                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full hover:bg-[#e9f3f2]"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div
                    role="status"
                    aria-label="Loading stalls"
                    className="space-y-4"
                >
                    {[0, 1].map((n) => (
                        <div
                            key={n}
                            className="h-[285px] animate-pulse rounded-[24px] bg-[#edf3f1]"
                        />
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-[24px] border border-[#e3e9e8] bg-white px-6 py-14 text-center">
                    <Store size={30} className="mx-auto text-[#9aafb0]" />
                    <h2 className="mt-3 text-lg font-bold">
                        We couldn&apos;t load the stalls
                    </h2>
                    <p className="mt-1 text-sm text-[#6e8588]">
                        Please check your connection and try again.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setLoading(true);
                            setRetry((r) => r + 1);
                        }}
                        className="mt-4 rounded-xl bg-[#087b86] px-5 py-2.5 text-sm font-bold text-white"
                    >
                        Try again
                    </button>
                </div>
            ) : groups.length === 0 ? (
                <div className="rounded-[24px] border border-[#e3e9e8] bg-white px-6 py-14 text-center">
                    <MapPin size={30} className="mx-auto text-[#9aafb0]" />
                    <h2 className="mt-3 text-lg font-bold">
                        No matching stalls found
                    </h2>
                    <p className="mt-1 text-sm text-[#6e8588]">
                        Try another search or see all our stalls.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setFilter("all");
                            setSearch("");
                        }}
                        className="mt-4 rounded-xl bg-[#087b86] px-5 py-2.5 text-sm font-bold text-white"
                    >
                        Show all stalls
                    </button>
                </div>
            ) : (
                <div className="space-y-7">
                    {groups.map((section) => (
                        <section
                            key={section.key}
                            aria-labelledby={`stalls-${section.key}`}
                        >
                            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <h2
                                        id={`stalls-${section.key}`}
                                        className="text-[1.25rem] font-extrabold tracking-[-.035em] text-[#183e46] sm:text-[1.5rem]"
                                    >
                                        {section.title}
                                    </h2>
                                    <span className="rounded-full bg-[#f0f5f4] px-2.5 py-1 text-xs font-bold text-[#5e797c]">
                                        {section.items.length}
                                    </span>
                                </div>
                                <p className="text-xs text-[#819395] sm:text-[13px]">
                                    {section.description}
                                </p>
                            </div>
                            <div className="space-y-3.5">
                                {section.items.map((stall) => (
                                    <StallCard key={stall.id} stall={stall} />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-[20px] border border-[#e9ddcf] bg-[linear-gradient(105deg,#fff7ed,#fcfcf6)] px-5 py-5 sm:flex-row sm:items-center sm:px-7">
                <div>
                    <p className="text-base font-extrabold tracking-tight text-[#714c36]">
                        Handmade happiness, wherever you are.
                    </p>
                    <p className="mt-1 text-[13px] text-[#886e5b]">
                        Can&apos;t come to the stall? Discover our pieces
                        online.
                    </p>
                </div>
                <Link
                    href="/products"
                    className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-[#be764b] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#a86339]"
                >
                    Explore products <ArrowRight size={16} />
                </Link>
            </div>
        </div>
    );
}