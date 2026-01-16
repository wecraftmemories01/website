'use client'

import React, { useMemo, useState } from 'react'
import { Search, X, ChevronDown, ChevronRight, Tag, Layers, Grid, Box, Clock, Palette } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Option = { id: string; label: string; count?: number }

type Props = {
    q: string
    onQChange: (v: string) => void

    inStockOnly: boolean
    onToggleInStock: () => void

    masterOptions: Option[]
    superOptions: Option[]
    categoryOptions: Option[]
    subOptions: Option[]
    ageOptions: Option[]
    themeOptions: Option[]

    selectedMasters: string[]
    selectedSupers: string[]
    selectedCategories: string[]
    selectedSubs: string[]
    selectedAges: string[]
    selectedThemes: string[]

    onToggleMaster: (id: string) => void
    onToggleSuper: (id: string) => void
    onToggleCategory: (id: string) => void
    onToggleSub: (id: string) => void
    onToggleAge: (id: string) => void
    onToggleTheme: (id: string) => void

    onClearAll: () => void
}

const SECTION_ICON: Record<string, React.ReactNode> = {
    master: <Layers className="w-4 h-4" />,
    super: <Grid className="w-4 h-4" />,
    category: <Box className="w-4 h-4" />,
    sub: <Tag className="w-4 h-4" />,
    age: <Clock className="w-4 h-4" />,
    theme: <Palette className="w-4 h-4" />,
}

const CHIP_COLOR_PALETTE = [
    'from-rose-300 to-rose-400',
    'from-orange-300 to-orange-400',
    'from-amber-300 to-amber-400',
    'from-lime-300 to-lime-400',
    'from-emerald-300 to-emerald-400',
    'from-sky-300 to-sky-400',
    'from-indigo-300 to-indigo-400',
    'from-fuchsia-300 to-fuchsia-400',
]

function IconClear() {
    return <X className="w-3 h-3" />
}

function SectionHeader({
    title,
    count,
    onClear,
    expanded,
    setExpanded,
    icon,
}: {
    title: string
    count?: number
    onClear?: () => void
    expanded?: boolean
    setExpanded?: (v: boolean) => void
    icon?: React.ReactNode
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setExpanded && setExpanded(!expanded)}
                    aria-expanded={expanded}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 focus:outline-none"
                >
                    <span className="text-slate-400">
                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="text-slate-500">{icon}</span>
                        {title}
                    </span>
                </button>
                {typeof count === 'number' && <span className="text-xs text-slate-400">({count})</span>}
            </div>

            <div className="flex items-center gap-2">
                {onClear && (
                    <button
                        onClick={onClear}
                        className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded focus:outline-none"
                        title={`Clear ${title}`}
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    )
}

export default function SidebarFilters({
    q,
    onQChange,
    inStockOnly,
    onToggleInStock,
    masterOptions,
    superOptions,
    categoryOptions,
    subOptions,
    ageOptions,
    themeOptions,
    selectedMasters,
    selectedSupers,
    selectedCategories,
    selectedSubs,
    selectedAges,
    selectedThemes,
    onToggleMaster,
    onToggleSuper,
    onToggleCategory,
    onToggleSub,
    onToggleAge,
    onToggleTheme,
    onClearAll,
}: Props) {
    // ui state
    const [searchMaster, setSearchMaster] = useState('')
    const [searchSuper, setSearchSuper] = useState('')
    const [searchCategory, setSearchCategory] = useState('')
    const [searchSub, setSearchSub] = useState('')
    const [searchAge, setSearchAge] = useState('')
    const [searchTheme, setSearchTheme] = useState('')

    const [expanded, setExpanded] = useState({
        master: true,
        super: true,
        category: true,
        sub: true,
        age: true,
        theme: true,
    } as Record<string, boolean>)

    // show only available (count > 0)
    const onlyAvailable = (opts: Option[]) => opts.filter((o) => (o.count ?? 0) > 0)

    const filterOptions = (opts: Option[], q: string) =>
        opts
            .filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()))
            .sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || a.label.localeCompare(b.label))

    const masters = useMemo(() => filterOptions(onlyAvailable(masterOptions), searchMaster), [masterOptions, searchMaster])
    const supers = useMemo(() => filterOptions(onlyAvailable(superOptions), searchSuper), [superOptions, searchSuper])
    const cats = useMemo(() => filterOptions(onlyAvailable(categoryOptions), searchCategory), [categoryOptions, searchCategory])
    const subs = useMemo(() => filterOptions(onlyAvailable(subOptions), searchSub), [subOptions, searchSub])
    const ages = useMemo(() => filterOptions(onlyAvailable(ageOptions), searchAge), [ageOptions, searchAge])
    const themes = useMemo(() => filterOptions(onlyAvailable(themeOptions), searchTheme), [themeOptions, searchTheme])

    const allOptionsById = useMemo(() => {
        const map = new Map<string, string>()
            ;[...masterOptions, ...superOptions, ...categoryOptions, ...subOptions, ...ageOptions, ...themeOptions].forEach((o) =>
                map.set(o.id, o.label)
            )
        return map
    }, [masterOptions, superOptions, categoryOptions, subOptions, ageOptions, themeOptions])

    const showSelectedChips = [
        ...selectedMasters.map((id) => ({ id, type: 'master' as const })),
        ...selectedSupers.map((id) => ({ id, type: 'super' as const })),
        ...selectedCategories.map((id) => ({ id, type: 'category' as const })),
        ...selectedSubs.map((id) => ({ id, type: 'sub' as const })),
        ...selectedAges.map((id) => ({ id, type: 'age' as const })),
        ...selectedThemes.map((id) => ({ id, type: 'theme' as const })),
    ]

    // chips color helper: deterministic color from id
    const colorForId = (id: string) => {
        let h = 0
        for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i)
        const idx = Math.abs(h) % CHIP_COLOR_PALETTE.length
        return CHIP_COLOR_PALETTE[idx]
    }

    function OptionChip({
        option,
        checked,
        onToggle,
    }: {
        option: Option
        checked: boolean
        onToggle: (id: string) => void
    }) {
        const gradient = colorForId(option.id)
        return (
            <button
                type="button"
                onClick={() => onToggle(option.id)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm shadow-sm border transition transform active:scale-95 focus:outline-none
          ${checked ? `text-white bg-gradient-to-r ${gradient} border-transparent shadow-lg` : 'bg-white text-slate-800 border-slate-100 hover:drop-shadow-md'}`}
                aria-pressed={checked}
                title={`${option.label} — ${option.count ?? 0} items`}
            >
                <span className={`w-2 h-2 rounded-full ${checked ? 'bg-white/30' : 'bg-slate-200'}`} />
                <span className="truncate max-w-[10rem]">{option.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${checked ? 'bg-white/20' : 'bg-white/50 text-slate-600'}`}>
                    {option.count ?? 0}
                </span>
            </button>
        )
    }

    function Section({
        title,
        options,
        search,
        setSearch,
        selectedIds,
        onToggle,
        clearSelected,
        name,
        limit = 10,
    }: {
        title: string
        options: Option[]
        search: string
        setSearch: (v: string) => void
        selectedIds: string[]
        onToggle: (id: string) => void
        clearSelected?: () => void
        name: string
        limit?: number
    }) {
        const isExpanded = expanded[name]
        const short = options.slice(0, limit)
        const moreCount = Math.max(0, options.length - limit)

        return (
            <div className="relative border rounded-lg p-3 bg-white shadow-sm">
                <div
                    className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${selectedIds.length ? 'bg-teal-400' : 'bg-transparent'}`}
                    aria-hidden
                />
                <SectionHeader
                    title={title}
                    count={options.length}
                    onClear={clearSelected}
                    expanded={isExpanded}
                    setExpanded={(v) => setExpanded((s) => ({ ...s, [name]: v }))}
                    icon={SECTION_ICON[name as keyof typeof SECTION_ICON]}
                />

                <AnimatePresence initial={false}>
                    {isExpanded && (
                        <motion.div
                            key={name}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18 }}
                            className="mt-3"
                        >
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder={`Search ${title.toLowerCase()}...`}
                                        className="w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-100"
                                    />
                                </div>

                                {search && (
                                    <button
                                        onClick={() => setSearch('')}
                                        className="px-3 py-2 rounded-md text-sm bg-slate-50 border hover:bg-slate-100"
                                        title="Clear search"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="mt-3 flex flex-col gap-2">
                                {(search ? options : short).map((o) => (
                                    <OptionChip key={o.id} option={o} checked={selectedIds.includes(o.id)} onToggle={onToggle} />
                                ))}

                                {!search && moreCount > 0 && (
                                    <button
                                        onClick={() => setExpanded((s) => ({ ...s, [name]: true }))}
                                        className="px-3 py-1 rounded-full border text-sm text-slate-600 bg-slate-50 hover:bg-slate-100"
                                    >
                                        +{moreCount} more
                                    </button>
                                )}

                                {options.length === 0 && <div className="text-xs text-slate-400">No available options</div>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )
    }

    const clearMasters = () => selectedMasters.forEach((id) => onToggleMaster(id))
    const clearSupers = () => selectedSupers.forEach((id) => onToggleSuper(id))
    const clearCategories = () => selectedCategories.forEach((id) => onToggleCategory(id))
    const clearSubs = () => selectedSubs.forEach((id) => onToggleSub(id))
    const clearAges = () => selectedAges.forEach((id) => onToggleAge(id))
    const clearThemes = () => selectedThemes.forEach((id) => onToggleTheme(id))

    const hasAnyFilters = [masters, supers, cats, subs, ages, themes].some((arr) => arr.length > 0)
    const hasAnySelection = showSelectedChips.length > 0 || inStockOnly || q.trim().length > 0

    return (
        <div className="space-y-5">
            {/* header: gradient search + stacked controls below */}
            <div className="rounded-lg overflow-hidden shadow-md">
                <div className="px-4 py-3 bg-gradient-to-r from-teal-50 via-sky-50 to-indigo-50 rounded-md">
                    {/* Search input */}
                    <div className="relative">
                        <label htmlFor="global-search" className="sr-only">
                            Search products
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                id="global-search"
                                type="search"
                                value={q}
                                onChange={(e) => onQChange(e.target.value)}
                                placeholder="Search products, tags or names..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-teal-200 text-sm bg-white"
                            />
                        </div>
                    </div>

                    {/* Controls stacked below search */}
                    <div className="mt-3 flex items-center justify-between">
                        <button
                            onClick={() => {
                                if (hasAnySelection) onClearAll()
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${hasAnySelection ? 'bg-white border' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                            disabled={!hasAnySelection}
                            title={hasAnySelection ? 'Clear search & selections' : 'Nothing to clear'}
                        >
                            <X className="w-4 h-4" />
                            Clear
                        </button>

                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input type="checkbox" checked={inStockOnly} onChange={onToggleInStock} className="accent-teal-600 w-4 h-4" />
                            <span>In stock only</span>
                        </label>
                    </div>
                </div>

                {/* decorative separator */}
                <div className="h-1 bg-gradient-to-r from-teal-300 via-teal-200 to-white" />
            </div>

            {/* selected chips */}
            <div>
                {showSelectedChips.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                        {showSelectedChips.map((c) => {
                            const label = allOptionsById.get(c.id) ?? c.id
                            const gradient = colorForId(c.id)
                            return (
                                <span
                                    key={`${c.type}-${c.id}`}
                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${gradient} shadow`}
                                >
                                    <span className="truncate max-w-[12rem]">{label}</span>
                                    <button
                                        onClick={() => {
                                            if (c.type === 'master') onToggleMaster(c.id)
                                            else if (c.type === 'super') onToggleSuper(c.id)
                                            else if (c.type === 'category') onToggleCategory(c.id)
                                            else if (c.type === 'sub') onToggleSub(c.id)
                                            else if (c.type === 'age') onToggleAge(c.id)
                                            else if (c.type === 'theme') onToggleTheme(c.id)
                                        }}
                                        className="ml-1 text-xs p-1 rounded-full bg-white/20 hover:bg-white/30"
                                        aria-label={`Remove ${label}`}
                                    >
                                        <IconClear />
                                    </button>
                                </span>
                            )
                        })}
                    </div>
                ) : null}
            </div>

            {/* sections (only render when available) */}
            {/* {masters.length > 0 && (
                <Section
                    title="Master Category"
                    options={masters}
                    search={searchMaster}
                    setSearch={setSearchMaster}
                    selectedIds={selectedMasters}
                    onToggle={onToggleMaster}
                    clearSelected={clearMasters}
                    name="master"
                />
            )} */}

            {/* {supers.length > 0 && (
                <Section
                    title="Super Category"
                    options={supers}
                    search={searchSuper}
                    setSearch={setSearchSuper}
                    selectedIds={selectedSupers}
                    onToggle={onToggleSuper}
                    clearSelected={clearSupers}
                    name="super"
                />
            )} */}

            {/* {cats.length > 0 && (
                <Section
                    title="Category"
                    options={cats}
                    search={searchCategory}
                    setSearch={setSearchCategory}
                    selectedIds={selectedCategories}
                    onToggle={onToggleCategory}
                    clearSelected={clearCategories}
                    name="category"
                />
            )} */}

            {/* {subs.length > 0 && (
                <Section
                    title="Sub Category"
                    options={subs}
                    search={searchSub}
                    setSearch={setSearchSub}
                    selectedIds={selectedSubs}
                    onToggle={onToggleSub}
                    clearSelected={clearSubs}
                    name="sub"
                />
            )} */}

            {/* {ages.length > 0 && (
                <Section
                    title="Age Group"
                    options={ages}
                    search={searchAge}
                    setSearch={setSearchAge}
                    selectedIds={selectedAges}
                    onToggle={onToggleAge}
                    clearSelected={clearAges}
                    name="age"
                    limit={8}
                />
            )} */}

            {themes.length > 0 && (
                <Section
                    title="Theme"
                    options={themes}
                    search={searchTheme}
                    setSearch={setSearchTheme}
                    selectedIds={selectedThemes}
                    onToggle={onToggleTheme}
                    clearSelected={clearThemes}
                    name="theme"
                />
            )}

            {!hasAnyFilters && (
                <div className="text-xs text-slate-400">No filters available for the current selection.</div>
            )}

            <div className="pt-3 border-t">
                <button
                    onClick={() => {
                        if (hasAnySelection) onClearAll()
                    }}
                    className={`w-full px-3 py-2 rounded-md text-sm font-semibold ${hasAnySelection ? 'bg-gradient-to-r from-slate-100 to-white border' : 'bg-slate-50 text-slate-400 cursor-not-allowed'}`}
                    disabled={!hasAnySelection}
                >
                    Reset filters
                </button>
            </div>
        </div>
    )
}