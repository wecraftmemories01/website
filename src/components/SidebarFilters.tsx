"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";

type Option = { id: string; label: string; count?: number };

type Props = {
    variant?: "sidebar" | "drawer";
    q: string;
    onQChange: (v: string) => void;
    inStockOnly: boolean;
    onToggleInStock: () => void;
    masterOptions: Option[];
    superOptions: Option[];
    categoryOptions: Option[];
    subOptions: Option[];
    ageOptions: Option[];
    themeOptions: Option[];
    selectedMasters: string[];
    selectedSupers: string[];
    selectedCategories: string[];
    selectedSubs: string[];
    selectedAges: string[];
    selectedThemes: string[];
    minPrice: number | "";
    maxPrice: number | "";
    onMinPriceChange: (v: number | "") => void;
    onMaxPriceChange: (v: number | "") => void;
    priceRangeMin: number;
    priceRangeMax: number;
    onToggleMaster: (id: string) => void;
    onToggleSuper: (id: string) => void;
    onToggleCategory: (id: string) => void;
    onToggleSub: (id: string) => void;
    onToggleAge: (id: string) => void;
    onToggleTheme: (id: string) => void;
    onClearAll: () => void;
};

type Group = {
    id: string;
    title: string;
    options: Option[];
    selected: string[];
    toggle: (id: string) => void;
};

function ChoiceGroup({ group }: { group: Group }) {
    const [term, setTerm] = useState("");
    const [showAll, setShowAll] = useState(false);
    const [expanded, setExpanded] = useState(
        group.id === "category" || group.id === "theme",
    );
    const choices = useMemo(() => {
        const found = group.options.filter((option) =>
            option.label.toLowerCase().includes(term.trim().toLowerCase()),
        );
        return found.sort(
            (a, b) =>
                Number(group.selected.includes(b.id)) -
                    Number(group.selected.includes(a.id)) ||
                (b.count ?? 0) - (a.count ?? 0) ||
                a.label.localeCompare(b.label),
        );
    }, [group.options, group.selected, term]);
    if (!group.options.length && !group.selected.length) return null;
    const shown = showAll || term ? choices : choices.slice(0, 8);
    return (
        <section
            className="rounded-[17px] border border-[#e3f2f5] bg-[#fbfeff] px-3.5 py-3.5 sm:px-4"
            aria-label={group.title}
        >
            <button
                type="button"
                className="flex min-h-8 w-full items-center justify-between gap-3 text-left"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
            >
                <span className="flex items-center gap-2 text-sm font-bold text-[#234b3e]">
                    {group.title}
                    {group.selected.length > 0 && (
                        <span className="rounded-full bg-[#e4f2e8] px-2 py-0.5 text-xs text-[#065975]">
                            {group.selected.length}
                        </span>
                    )}
                </span>
                <ChevronDown
                    size={17}
                    className={`shrink-0 text-[#698276] transition-transform ${expanded ? "rotate-180" : ""}`}
                />
            </button>
            {expanded && (
                <div className="pt-3">
                    {group.options.length > 10 && (
                        <div className="relative mb-3">
                            <Search
                                size={16}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8ba397]"
                            />
                            <input
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                                type="search"
                                aria-label={`Search ${group.title}`}
                                placeholder={`Find ${group.title.toLowerCase()}…`}
                                className="site-field !min-h-10 w-full !pl-9 text-sm"
                            />
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {shown.map((option) => {
                            const active = group.selected.includes(option.id);
                            const disabled = !active && option.count === 0;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    aria-pressed={active}
                                    disabled={disabled}
                                    onClick={() => group.toggle(option.id)}
                                    className={`min-h-9 max-w-full rounded-full border px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 ${active ? "border-[#065975] bg-[#065975] text-white shadow-sm" : disabled ? "border-[#f1f8f9] bg-[#f7f8f6] text-[#adb9ae]" : "border-[#dbecf0] bg-[#f8fbf7] text-[#36584a] hover:border-[#83aa91] hover:bg-[#e6f7f9]"}`}
                                >
                                    <span className="break-words">
                                        {option.label}
                                    </span>
                                    {typeof option.count === "number" && (
                                        <span
                                            className={`ml-1.5 text-[11px] ${active ? "text-white/70" : "text-[#8b9a8b]"}`}
                                        >
                                            {option.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        {!choices.length && (
                            <p className="text-sm text-[#76877a]">
                                No matching options
                            </p>
                        )}
                    </div>
                    {!term && choices.length > 8 && (
                        <button
                            type="button"
                            onClick={() => setShowAll((v) => !v)}
                            className="mt-3 text-xs font-bold text-[#065975] underline-offset-4 hover:underline"
                        >
                            {showAll
                                ? "Show fewer"
                                : `Show all ${choices.length}`}
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}

export default function SidebarFilters(props: Props) {
    const searchId = useId();
    const isSidebar = props.variant === "sidebar";
    const groups: Group[] = [
        {
            id: "category",
            title: "Categories",
            options: props.categoryOptions,
            selected: props.selectedCategories,
            toggle: props.onToggleCategory,
        },
        {
            id: "theme",
            title: "Collections & occasions",
            options: props.themeOptions,
            selected: props.selectedThemes,
            toggle: props.onToggleTheme,
        },
        {
            id: "master",
            title: "Product families",
            options: props.masterOptions,
            selected: props.selectedMasters,
            toggle: props.onToggleMaster,
        },
        {
            id: "super",
            title: "Product types",
            options: props.superOptions,
            selected: props.selectedSupers,
            toggle: props.onToggleSuper,
        },
        {
            id: "sub",
            title: "Styles",
            options: props.subOptions,
            selected: props.selectedSubs,
            toggle: props.onToggleSub,
        },
        {
            id: "age",
            title: "Age groups",
            options: props.ageOptions,
            selected: props.selectedAges,
            toggle: props.onToggleAge,
        },
    ];
    const count =
        groups.reduce((sum, group) => sum + group.selected.length, 0) +
        Number(props.inStockOnly) +
        Number(props.minPrice !== "") +
        Number(props.maxPrice !== "") +
        Number(Boolean(props.q.trim()));
    return (
        <div className={isSidebar ? "space-y-3" : "space-y-4"}>
            <div
                className={
                    isSidebar
                        ? "grid gap-3"
                        : "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                }
            >
                {!isSidebar && (
                    <div>
                        <label
                            htmlFor={searchId}
                            className="mb-1.5 block text-xs font-bold uppercase tracking-[.1em] text-[#607987]"
                        >
                            Search gifts
                        </label>
                        <div className="relative">
                            <Search
                                size={18}
                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#769381]"
                            />
                            <input
                                id={searchId}
                                type="search"
                                value={props.q}
                                onChange={(e) =>
                                    props.onQChange(e.target.value)
                                }
                                placeholder="Search crochet, gifts, flowers…"
                                className="site-field !min-h-12 w-full !pl-11 text-sm"
                            />
                        </div>
                    </div>
                )}
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#deebde] bg-[#f5fbfc] px-4 text-sm font-semibold text-[#365b4b]">
                    <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={props.inStockOnly}
                        onChange={props.onToggleInStock}
                    />{" "}
                    In stock only
                </label>
            </div>
            <div
                className={
                    isSidebar
                        ? "grid gap-3"
                        : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                }
            >
                {groups.map((group) => (
                    <ChoiceGroup key={group.id} group={group} />
                ))}
                <section
                    className="rounded-[17px] border border-[#e3f2f5] bg-[#fbfeff] px-3.5 py-3.5 sm:px-4"
                    aria-label="Price range"
                >
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#234b3e]">
                        <SlidersHorizontal size={16} /> Budget
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="min-w-0 text-xs font-medium text-[#667d70]">
                            Minimum ₹
                            <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                value={props.minPrice}
                                onChange={(e) =>
                                    props.onMinPriceChange(
                                        e.target.value === ""
                                            ? ""
                                            : Math.max(
                                                  0,
                                                  Number(e.target.value),
                                              ),
                                    )
                                }
                                placeholder="Any"
                                className="site-field mt-1.5 !min-h-10 w-full !px-3 text-sm"
                            />
                        </label>
                        <label className="min-w-0 text-xs font-medium text-[#667d70]">
                            Maximum ₹
                            <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                value={props.maxPrice}
                                onChange={(e) =>
                                    props.onMaxPriceChange(
                                        e.target.value === ""
                                            ? ""
                                            : Math.max(
                                                  0,
                                                  Number(e.target.value),
                                              ),
                                    )
                                }
                                placeholder="Any"
                                className="site-field mt-1.5 !min-h-10 w-full !px-3 text-sm"
                            />
                        </label>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#879587]">
                        Set one or both amounts to find gifts within your
                        budget.
                    </p>
                </section>
            </div>
            {count > 0 && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={props.onClearAll}
                        className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[#9b5341] hover:bg-[#fff3ed]"
                    >
                        <X size={15} /> Clear all filters ({count})
                    </button>
                </div>
            )}
        </div>
    );
}