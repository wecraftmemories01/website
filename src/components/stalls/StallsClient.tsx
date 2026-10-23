"use client";

import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    CalendarDays,
    ChevronDown,
    MapPin,
    Search,
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
const headings: Record<
    StallStatus,
    { title: string; detail: string; dot: string }
> = {
    ongoing: {
        title: "Happening now",
        detail: "Come visit us!",
        dot: "bg-[#1ca875]",
    },
    upcoming: {
        title: "Coming up next",
        detail: "Make a plan to meet us",
        dot: "bg-[#2499bf]",
    },
    completed: {
        title: "Past stalls",
        detail: "Memories from our previous events",
        dot: "bg-[#98a7ae]",
    },
};
const INITIAL_SHOW = 2;

export default function StallsClient() {
    const [stalls, setStalls] = useState<PublicStall[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [expanded, setExpanded] = useState<Record<StallStatus, boolean>>({
        ongoing: false,
        upcoming: false,
        completed: false,
    });

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
        const query = search.trim().toLocaleLowerCase();
        const priority: Record<StallStatus, number> = {
            ongoing: 0,
            upcoming: 1,
            completed: 2,
        };
        return stalls
            .filter(
                (s) =>
                    (filter === "all" || s.status === filter) &&
                    (!query ||
                        [
                            s.name,
                            s.stallNumber,
                            s.locationName,
                            s.address,
                            s.description,
                            ...s.products.map((p) => p.name),
                        ]
                            .join(" ")
                            .toLocaleLowerCase()
                            .includes(query)),
            )
            .sort(
                (a, b) =>
                    priority[a.status] - priority[b.status] ||
                    (a.status === "completed"
                        ? b.endDate.localeCompare(a.endDate)
                        : a.startDate.localeCompare(b.startDate)) ||
                    a.name.localeCompare(b.name),
            );
    }, [stalls, filter, search]);

    const grouped = useMemo(
        () =>
            (["ongoing", "upcoming", "completed"] as StallStatus[])
                .map((status) => ({
                    status,
                    items: visible.filter((s) => s.status === status),
                }))
                .filter((group) => group.items.length > 0),
        [visible],
    );

    return (
        <div className="mx-auto w-full max-w-[1480px] pb-10 text-[#173b4a]">
            <header className="mb-5 rounded-[24px] border border-[#e5edf0] bg-[linear-gradient(105deg,#eaf7fa_0%,#f7fcfc_52%,#fffaf5_100%)] px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#087c9b]">
                            <Store size={14} /> Meet We Craft Memories
                        </p>
                        <h1 className="mt-1.5 font-serif text-[clamp(1.75rem,3.2vw,2.65rem)] font-semibold leading-tight tracking-tight text-[#123f51]">
                            Find us at a stall near you
                        </h1>
                        <p className="mt-1.5 text-sm leading-6 text-[#627b85]">
                            Discover where we are, where we're headed, and the
                            handmade creations you'll find.
                        </p>
                    </div>
                    {!loading && !error && (
                        <div
                            className="flex shrink-0 flex-wrap gap-2"
                            aria-label="Stall overview"
                        >
                            {counts.ongoing > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilter("ongoing");
                                        setSearch("");
                                    }}
                                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#15774f] ring-1 ring-[#bde2d0] hover:bg-[#edf8f1]"
                                >
                                    <span className="h-2 w-2 rounded-full bg-[#22a873]" />{" "}
                                    {counts.ongoing} ongoing
                                </button>
                            )}
                            {counts.upcoming > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilter("upcoming");
                                        setSearch("");
                                    }}
                                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#136e89] ring-1 ring-[#c4e5ef] hover:bg-[#eff8fb]"
                                >
                                    <CalendarDays size={14} /> {counts.upcoming}{" "}
                                    upcoming
                                </button>
                            )}
                            {counts.completed > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilter("completed");
                                        setSearch("");
                                    }}
                                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#657982] ring-1 ring-[#dbe4e8] hover:bg-[#f4f7f8]"
                                >
                                    {counts.completed} past
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <div
                className="mb-5 flex flex-col gap-3 rounded-[20px] border border-[#e8edf0] bg-white p-3 shadow-[0_5px_20px_rgba(15,58,76,.035)] lg:flex-row lg:items-center lg:justify-between"
                aria-label="Find stalls"
            >
                <div
                    role="group"
                    aria-label="Stall status filter"
                    className="flex w-full gap-1 overflow-x-auto rounded-xl bg-[#f3f7f8] p-1 lg:w-auto"
                >
                    {filters.map((tab) => (
                        <button
                            type="button"
                            key={tab.value}
                            onClick={() => setFilter(tab.value)}
                            aria-pressed={filter === tab.value}
                            className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold transition sm:px-4 sm:text-sm ${filter === tab.value ? "bg-white text-[#0a6984] shadow-[0_2px_8px_rgba(12,60,80,.08)]" : "text-[#637d87] hover:text-[#173b4a]"}`}
                        >
                            {tab.label}{" "}
                            {!loading && !error && (
                                <span
                                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${filter === tab.value ? "bg-[#e9f6f9]" : "bg-[#e7edef]"}`}
                                >
                                    {counts[tab.value]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="relative w-full lg:max-w-[310px]">
                    <Search
                        size={17}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8da2aa]"
                    />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search stalls or locations"
                        aria-label="Search stalls or locations"
                        className="min-h-11 w-full rounded-xl border border-[#e1e9ec] bg-[#fcfdfd] py-2.5 pl-10 pr-9 text-sm outline-none transition focus:border-[#73b5cb] focus:ring-2 focus:ring-[#cde9f2]"
                    />
                    {search && (
                        <button
                            type="button"
                            aria-label="Clear search"
                            onClick={() => setSearch("")}
                            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#7d959e] hover:bg-[#edf6f9]"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div
                    role="status"
                    aria-label="Loading stalls"
                    className="grid gap-4 md:grid-cols-2"
                >
                    <div className="h-[265px] animate-pulse rounded-3xl bg-[#edf4f6]" />
                    <div className="h-[265px] animate-pulse rounded-3xl bg-[#edf4f6]" />
                </div>
            ) : error ? (
                <div className="rounded-3xl border border-[#e4edef] bg-white px-6 py-12 text-center">
                    <p className="text-lg font-bold">
                        We couldn't load the stalls
                    </p>
                    <p className="mt-2 text-sm text-[#728791]">
                        Please try again.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setLoading(true);
                            setRetry((n) => n + 1);
                        }}
                        className="mt-4 rounded-xl bg-[#0d6884] px-6 py-2.5 text-sm font-bold text-white"
                    >
                        Try again
                    </button>
                </div>
            ) : grouped.length === 0 ? (
                <div className="rounded-3xl border border-[#e4edef] bg-white px-6 py-12 text-center">
                    <MapPin className="mx-auto text-[#9ab1b9]" size={28} />
                    <h2 className="mt-3 text-xl font-bold">No stalls found</h2>
                    <p className="mt-2 text-sm text-[#728791]">
                        Try another search or select All stalls.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setFilter("all");
                            setSearch("");
                        }}
                        className="mt-4 rounded-xl bg-[#0d6884] px-5 py-2.5 text-sm font-bold text-white"
                    >
                        Show all stalls
                    </button>
                </div>
            ) : (
                <div className="space-y-7">
                    {grouped.map(({ status, items }) => {
                        const collapsedPast =
                            filter === "all" &&
                            !search.trim() &&
                            status === "completed" &&
                            !expanded.completed;
                        const limit = filter === "all" ? INITIAL_SHOW : 6;
                        const displayed = collapsedPast
                            ? []
                            : expanded[status]
                              ? items
                              : items.slice(0, limit);
                        const extra = items.length - displayed.length;
                        return (
                            <section
                                key={status}
                                aria-labelledby={`stall-group-${status}`}
                            >
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <span
                                            className={`h-2.5 w-2.5 rounded-full ${headings[status].dot}`}
                                        />
                                        <h2
                                            id={`stall-group-${status}`}
                                            className="text-lg font-bold text-[#173b4a] sm:text-xl"
                                        >
                                            {headings[status].title}
                                        </h2>
                                        <span className="rounded-full bg-[#eaf0f2] px-2 py-0.5 text-xs font-bold text-[#59717c]">
                                            {items.length}
                                        </span>
                                        <p className="hidden text-sm text-[#84969e] sm:block">
                                            {headings[status].detail}
                                        </p>
                                    </div>
                                    {collapsedPast && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpanded((current) => ({
                                                    ...current,
                                                    completed: true,
                                                }))
                                            }
                                            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0b7692] hover:underline"
                                        >
                                            Browse past stalls{" "}
                                            <ChevronDown size={16} />
                                        </button>
                                    )}
                                </div>
                                {!collapsedPast && (
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        {displayed.map((s) => (
                                            <div
                                                key={s.id}
                                                className={
                                                    items.length === 1
                                                        ? "lg:col-span-2"
                                                        : ""
                                                }
                                            >
                                                <StallCard stall={s} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {!collapsedPast && extra > 0 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setExpanded((current) => ({
                                                ...current,
                                                [status]: true,
                                            }))
                                        }
                                        className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#d6e4e9] bg-white px-4 py-2 text-xs font-bold text-[#0b7490] transition hover:bg-[#f2f9fb]"
                                    >
                                        Show {extra} more{" "}
                                        {status === "completed"
                                            ? "past"
                                            : status}{" "}
                                        stalls <ArrowRight size={14} />
                                    </button>
                                )}
                                {!collapsedPast &&
                                    expanded[status] &&
                                    items.length > limit && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpanded((current) => ({
                                                    ...current,
                                                    [status]: false,
                                                }))
                                            }
                                            className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-[#d6e4e9] bg-white px-4 py-2 text-xs font-bold text-[#0b7490]"
                                        >
                                            Show fewer
                                        </button>
                                    )}
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}