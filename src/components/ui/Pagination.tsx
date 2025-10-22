'use client'

import React from 'react'

type Props = {
    page: number
    totalPages: number
    onPageChange: (p: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: Props) {
    const canPrev = page > 1
    const canNext = page < totalPages

    const go = (p: number) => {
        const next = Math.max(1, Math.min(totalPages, p))
        if (next !== page) onPageChange(next)
    }

    // show up to 5 page numbers with current centered when possible
    const range = () => {
        const out: number[] = []
        const start = Math.max(1, page - 2)
        const end = Math.min(totalPages, start + 4)
        for (let i = start; i <= end; i++) out.push(i)
        return out
    }

    return (
        <nav className="inline-flex items-center gap-2">
            <button
                onClick={() => go(page - 1)}
                disabled={!canPrev}
                className={`px-3 py-1 rounded-md text-sm ${canPrev ? 'bg-white border border-slate-200' : 'text-slate-300'}`}
            >
                Prev
            </button>

            {range().map((p) => (
                <button
                    key={p}
                    onClick={() => go(p)}
                    className={`px-3 py-1 rounded-md text-sm ${p === page ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200'}`}
                >
                    {p}
                </button>
            ))}

            <button
                onClick={() => go(page + 1)}
                disabled={!canNext}
                className={`px-3 py-1 rounded-md text-sm ${canNext ? 'bg-white border border-slate-200' : 'text-slate-300'}`}
            >
                Next
            </button>
        </nav>
    )
}