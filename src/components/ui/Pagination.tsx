"use client";

import React from "react";

type Props = {
    page: number;
    totalPages: number;
    onPageChange: (p: number) => void;
    maxVisible?: number;
};

export default function Pagination({
    page,
    totalPages,
    onPageChange,
    maxVisible = 8,
}: Props) {
    const canPrev = page > 1;
    const canNext = page < totalPages;

    const go = (p: number) => {
        const next = Math.max(1, Math.min(totalPages, p));
        if (next !== page) onPageChange(next);
    };

    const range = (): number[] => {
        const visible = Math.min(maxVisible, totalPages);

        let start = page - Math.floor(visible / 2);
        start = Math.max(
            1,
            Math.min(start, Math.max(1, totalPages - visible + 1))
        );

        return Array.from({ length: visible }, (_, i) => start + i);
    };

    const pages = range();
    const firstVisible = pages[0];
    const lastVisible = pages[pages.length - 1];

    return (
        <>
            {/* Mobile Pagination */}
            <nav
                className="flex items-center justify-between gap-3 md:hidden"
                aria-label="Pagination"
            >
                <button
                    onClick={() => go(page - 1)}
                    disabled={!canPrev}
                    className={`px-4 py-2 rounded-md text-sm border ${canPrev
                            ? "bg-white border-slate-200"
                            : "text-slate-300 border-slate-100"
                        }`}
                >
                    ← Prev
                </button>

                <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                    Page {page} of {totalPages}
                </span>

                <button
                    onClick={() => go(page + 1)}
                    disabled={!canNext}
                    className={`px-4 py-2 rounded-md text-sm border ${canNext
                            ? "bg-white border-slate-200"
                            : "text-slate-300 border-slate-100"
                        }`}
                >
                    Next →
                </button>
            </nav>

            {/* Desktop Pagination */}
            <nav
                className="hidden md:inline-flex items-center gap-2"
                aria-label="Pagination"
            >
                <button
                    onClick={() => go(page - 1)}
                    disabled={!canPrev}
                    className={`px-3 py-1 rounded-md text-sm ${canPrev
                            ? "bg-white border border-slate-200"
                            : "text-slate-300"
                        }`}
                >
                    Prev
                </button>

                {firstVisible > 1 && (
                    <>
                        <button
                            onClick={() => go(1)}
                            className={`px-3 py-1 rounded-md text-sm ${page === 1
                                    ? "bg-teal-600 text-white"
                                    : "bg-white border border-slate-200"
                                }`}
                        >
                            1
                        </button>

                        {firstVisible > 2 && (
                            <span className="px-2 text-sm text-slate-400">
                                …
                            </span>
                        )}
                    </>
                )}

                {pages.map((p) => (
                    <button
                        key={p}
                        onClick={() => go(p)}
                        aria-current={p === page ? "page" : undefined}
                        className={`px-3 py-1 rounded-md text-sm ${p === page
                                ? "bg-teal-600 text-white"
                                : "bg-white border border-slate-200"
                            }`}
                    >
                        {p}
                    </button>
                ))}

                {lastVisible < totalPages && (
                    <>
                        {lastVisible < totalPages - 1 && (
                            <span className="px-2 text-sm text-slate-400">
                                …
                            </span>
                        )}

                        <button
                            onClick={() => go(totalPages)}
                            className={`px-3 py-1 rounded-md text-sm ${page === totalPages
                                    ? "bg-teal-600 text-white"
                                    : "bg-white border border-slate-200"
                                }`}
                        >
                            {totalPages}
                        </button>
                    </>
                )}

                <button
                    onClick={() => go(page + 1)}
                    disabled={!canNext}
                    className={`px-3 py-1 rounded-md text-sm ${canNext
                            ? "bg-white border border-slate-200"
                            : "text-slate-300"
                        }`}
                >
                    Next
                </button>
            </nav>
        </>
    );
}