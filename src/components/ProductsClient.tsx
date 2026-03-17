'use client'

import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import ProductGrid from './ProductGrid'
import Pagination from './ui/Pagination'
import type { Product } from '../types/product'
import SidebarFilters from './SidebarFilters'
import { motion, AnimatePresence } from 'framer-motion'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/v1'

type IdLabel = { _id: string; publicName?: string; name?: string }

export default function ProductsClient() {
    const searchParams = useSearchParams() // read query params
    const router = useRouter()
    const productsTopRef = useRef<HTMLDivElement | null>(null)
    const q = searchParams.get('q') ?? ''
    const page = Number(searchParams.get('page') ?? 1)
    const perPage = Number(searchParams.get('limit') ?? 16)
    const paramsString = searchParams.toString()

    const [selectedThemes, setSelectedThemes] = useState<string[]>([])
    const [qState, setQState] = useState(q)

    useEffect(() => {

        const themeParam = searchParams.get('theme')

        if (!themeParam) {
            setSelectedThemes([])
            return
        }

        setSelectedThemes(themeParam.split(','))

    }, [searchParams])

    useEffect(() => {
        if (productsTopRef.current) {
            productsTopRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            })
        }
    }, [page])

    useEffect(() => {
        const urlQ = searchParams.get('q') ?? ''
        setQState(urlQ)
    }, [searchParams])

    const [allProducts, setAllProducts] = useState<Product[]>([])
    const [filtered, setFiltered] = useState<Product[]>([])
    const [totalRecords, setTotalRecords] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // lists for filters (master lists from API)
    const [masterCategories, setMasterCategories] = useState<IdLabel[]>([])
    const [superCategories, setSuperCategories] = useState<IdLabel[]>([])
    const [categories, setCategories] = useState<IdLabel[]>([])
    const [subCategories, setSubCategories] = useState<IdLabel[]>([])
    const [ageGroups, setAgeGroups] = useState<IdLabel[]>([])
    const [themes, setThemes] = useState<IdLabel[]>([])

    // multi-select filter state (arrays)
    const [selectedMasters, setSelectedMasters] = useState<string[]>([])
    const [selectedSupers, setSelectedSupers] = useState<string[]>([])
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [selectedSubs, setSelectedSubs] = useState<string[]>([])
    const [selectedAges, setSelectedAges] = useState<string[]>([])
    const [inStockOnly, setInStockOnly] = useState(false)
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [sortOpen, setSortOpen] = useState(false)
    const [sortBy, setSortBy] = useState("latest")
    const [minPrice, setMinPrice] = useState<number | ''>('')
    const [maxPrice, setMaxPrice] = useState<number | ''>('')
    const [debouncedMin, setDebouncedMin] = useState<number | ''>('')
    const [debouncedMax, setDebouncedMax] = useState<number | ''>('')

    const perPageOptions = [16, 32, 64]

    const safeDateMs = (s?: string | null) => {
        if (!s) return 0
        const t = Date.parse(s)
        return Number.isNaN(t) ? 0 : t
    }

    // fetch products + lists
    useEffect(() => {
        let mounted = true
        const fetchAll = async () => {
            setLoading(true)
            setError(null)
            try {
                const [pRes, allRes, mRes, sRes, cRes, subRes, ageRes, themeRes] = await Promise.all([
                    fetch(`${API_BASE}/product/sell?${searchParams.toString()}`),
                    fetch(`${API_BASE}/product/sell?page=1&limit=1000`),
                    fetch(`${API_BASE}/master_category`),
                    fetch(`${API_BASE}/super_category`),
                    fetch(`${API_BASE}/category`),
                    fetch(`${API_BASE}/sub_category`),
                    fetch(`${API_BASE}/age_group`),
                    fetch(`${API_BASE}/theme`),
                ])

                const [pJson, allJson, mJson, sJson, cJson, subJson, ageJson, themeJson] = await Promise.all([
                    pRes.json().catch(() => ({})),
                    allRes.json().catch(() => ({})),
                    mRes.json().catch(() => ({})),
                    sRes.json().catch(() => ({})),
                    cRes.json().catch(() => ({})),
                    subRes.json().catch(() => ({})),
                    ageRes.json().catch(() => ({})),
                    themeRes.json().catch(() => ({})),
                ])

                if (!mounted) return

                setAllProducts(Array.isArray(allJson?.productData) ? allJson.productData : [])
                setTotalRecords(pJson?.totalRecords ?? 0)

                setMasterCategories(Array.isArray(mJson?.masterCategoryData) ? mJson.masterCategoryData : [])
                setSuperCategories(Array.isArray(sJson?.superCategoryData) ? sJson.superCategoryData : [])
                setCategories(Array.isArray(cJson?.categoryData) ? cJson.categoryData : [])
                setSubCategories(Array.isArray(subJson?.subCategoryData) ? subJson.subCategoryData : [])
                setAgeGroups(Array.isArray(ageJson?.ageGroupData) ? ageJson.ageGroupData : [])
                setThemes(Array.isArray(themeJson?.themeData) ? themeJson.themeData : [])
            } catch (err: any) {
                console.error('Failed to fetch lists:', err)
                setError(err?.message ?? 'Failed to fetch data')
            } finally {
                if (mounted) setLoading(false)
            }
        }

        fetchAll()
        return () => {
            mounted = false
        }
    }, [paramsString])

    const priceStats = useMemo(() => {
        const prices = allProducts
            .map(p => p.latestSalePrice?.discountedPrice ?? p.latestSalePrice?.actualPrice)
            .filter((p): p is number => typeof p === 'number')

        if (!prices.length) {
            return { min: 0, max: 10000 }
        }

        return {
            min: 1,
            max: Math.ceil(Math.max(...prices))
        }
    }, [allProducts])

    const themeCounts = useMemo(() => {

        const map = new Map<string, number>()

        allProducts.forEach((p: any) => {

            if (!p.themeId) return

            const id = String(p.themeId)

            map.set(id, (map.get(id) ?? 0) + 1)

        })

        return map

    }, [allProducts])

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedMin(minPrice)
            setDebouncedMax(maxPrice)
        }, 150)

        return () => clearTimeout(t)
    }, [minPrice, maxPrice])

    // apply filters (multi-select)
    useEffect(() => {
        const term = qState.trim().toLowerCase()
        let list = [...allProducts]

        if (selectedMasters.length) {
            list = list.filter((p) => selectedMasters.includes(String(p.masterCategoryId)))
        }

        if (selectedSupers.length) {
            list = list.filter((p) => selectedSupers.includes(String(p.superCategoryId)))
        }

        if (selectedCategories.length) {
            list = list.filter((p) => selectedCategories.includes(String(p.categoryId)))
        }

        if (selectedSubs.length) {
            list = list.filter((p) => selectedSubs.includes(String(p.subCategoryId)))
        }

        if (selectedAges.length) {
            list = list.filter((p: any) => selectedAges.includes(String(p.ageGroupId ?? '')))
        }

        if (selectedThemes.length) {
            list = list.filter((p) =>
                p.themeId && selectedThemes.includes(String(p.themeId))
            )
        }

        if (inStockOnly) {
            list = list.filter((p) => {
                const qstr = String(p.sellStockQuantity ?? '').trim()
                if (qstr === '' || qstr === '0') return false
                const digits = parseInt(qstr.replace(/\D/g, ''), 10)
                return !Number.isNaN(digits) ? digits > 0 : true
            })
        }

        if (term) {
            list = list.filter((p: any) => {

                const name = (p.productName ?? '').toLowerCase()
                const sub = (p.subCategoryPublicName ?? '').toLowerCase()
                const cat = (p.categoryPublicName ?? '').toLowerCase()
                const sup = (p.superCategoryPublicName ?? '').toLowerCase()

                const tags = Array.isArray(p.tags)
                    ? p.tags.join(' ').toLowerCase()
                    : ''

                return (
                    name.includes(term) ||
                    sub.includes(term) ||
                    cat.includes(term) ||
                    sup.includes(term) ||
                    tags.includes(term)
                )
            })
        }

        // Price filter
        if (debouncedMin !== '' || debouncedMax !== '') {
            list = list.filter((p) => {
                const discounted = p.latestSalePrice?.discountedPrice
                const actual = p.latestSalePrice?.actualPrice
                const price = discounted ?? actual

                if (price === undefined || price === null) return false

                if (debouncedMin !== '' && price < debouncedMin) return false
                if (debouncedMax !== '' && price > debouncedMax) return false

                return true
            })
        }

        // SORT PRODUCTS
        if (sortBy === "price-low") {
            list.sort((a, b) =>
                (a.latestSalePrice?.discountedPrice ?? a.latestSalePrice?.actualPrice ?? 0) -
                (b.latestSalePrice?.discountedPrice ?? b.latestSalePrice?.actualPrice ?? 0)
            )
        } else if (sortBy === "price-high") {
            list.sort((a, b) =>
                (b.latestSalePrice?.discountedPrice ?? b.latestSalePrice?.actualPrice ?? 0) -
                (a.latestSalePrice?.discountedPrice ?? a.latestSalePrice?.actualPrice ?? 0)
            )
        } else {
            list.sort((a, b) => {
                const aMs = Math.max(safeDateMs(a.updatedAt), safeDateMs(a.createdAt))
                const bMs = Math.max(safeDateMs(b.updatedAt), safeDateMs(b.createdAt))
                return bMs - aMs
            })
        }

        setFiltered(list)
    }, [
        qState,
        selectedMasters,
        selectedSupers,
        selectedCategories,
        selectedSubs,
        selectedAges,
        selectedThemes,
        inStockOnly,
        debouncedMin,
        debouncedMax,
        allProducts,
        sortBy
    ]);

    const total = filtered.length
    const totalPages = Math.ceil(total / perPage)

    const pageItems = useMemo(() => {
        const start = (page - 1) * perPage
        return filtered.slice(start, start + perPage)
    }, [filtered, page, perPage])

    const toggle = (arr: string[], set: (v: string[]) => void, id: string) => {
        if (!id) return
        set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
    }

    function toggleTheme(themeId: string) {

        const params = new URLSearchParams(searchParams.toString())

        const current = selectedThemes

        let next

        if (current.includes(themeId)) {
            next = current.filter(x => x !== themeId)
        } else {
            next = [...current, themeId]
        }

        setSelectedThemes(next)

        if (next.length === 0) {
            params.delete('theme')
        } else {
            params.set('theme', next.join(','))
        }

        params.set('page', '1')

        router.push(`/products?${params.toString()}`)
    }

    const clearAll = () => {

        const params = new URLSearchParams()

        router.push(`/products?${params.toString()}`)
    }

    return (
        <div className="min-h-screen bg-gray-50 text-slate-900">
            <div className="max-w-350 mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* SHOP HEADER */}
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-slate-900">
                        Shop
                    </h1>

                    <p className="text-sm text-slate-500 mt-1">
                        Handmade crochet items crafted with care.
                    </p>
                </div>

                {/* MAIN GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
                    {/* FILTER SIDEBAR */}
                    <aside className="hidden lg:block bg-white rounded-xl shadow-sm p-4 h-fit sticky top-6">
                        <SidebarFilters
                            q={qState}
                            onQChange={(value) => {
                                setQState(value)
                                const params = new URLSearchParams(searchParams.toString())
                                if (value) params.set('q', value)
                                else params.delete('q')
                                params.set('page', '1')
                                router.push(`/products?${params.toString()}`)
                            }}
                            inStockOnly={inStockOnly}
                            onToggleInStock={() => setInStockOnly((s) => !s)}

                            masterOptions={masterCategories.map(m => ({
                                id: m._id,
                                label: m.publicName ?? m.name ?? ''
                            }))}

                            superOptions={superCategories.map(s => ({
                                id: s._id,
                                label: s.publicName ?? s.name ?? ''
                            }))}

                            categoryOptions={categories.map(c => ({
                                id: c._id,
                                label: c.publicName ?? c.name ?? ''
                            }))}

                            subOptions={subCategories.map(s => ({
                                id: s._id,
                                label: s.publicName ?? s.name ?? ''
                            }))}

                            ageOptions={ageGroups.map(a => ({
                                id: a._id,
                                label: a.publicName ?? a.name ?? ''
                            }))}

                            themeOptions={themes
                                .map(t => ({
                                    id: t._id,
                                    label: t.publicName ?? t.name ?? '',
                                    count: themeCounts.get(t._id) ?? 0
                                }))
                                .filter(t => t.count > 0)
                            }

                            selectedMasters={selectedMasters}
                            selectedSupers={selectedSupers}
                            selectedCategories={selectedCategories}
                            selectedSubs={selectedSubs}
                            selectedAges={selectedAges}
                            selectedThemes={selectedThemes}
                            minPrice={minPrice}
                            maxPrice={maxPrice}
                            onMinPriceChange={setMinPrice}
                            onMaxPriceChange={setMaxPrice}
                            priceRangeMin={priceStats.min}
                            priceRangeMax={priceStats.max}
                            onToggleMaster={(id) => toggle(selectedMasters, setSelectedMasters, id)}
                            onToggleSuper={(id) => toggle(selectedSupers, setSelectedSupers, id)}
                            onToggleCategory={(id) => toggle(selectedCategories, setSelectedCategories, id)}
                            onToggleSub={(id) => toggle(selectedSubs, setSelectedSubs, id)}
                            onToggleAge={(id) => toggle(selectedAges, setSelectedAges, id)}
                            onToggleTheme={toggleTheme}
                            onClearAll={clearAll}
                        />
                    </aside>

                    {/* PRODUCT AREA */}
                    <main ref={productsTopRef}>
                        {/* TOOLBAR */}
                        <div className="flex items-center justify-between mb-6">

                            {/* LEFT SIDE */}
                            <div className="flex items-center gap-4">

                                {/* MOBILE CONTROLS (unchanged) */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setFiltersOpen(true)}
                                        className="lg:hidden px-4 py-2 rounded-full border bg-white shadow-sm text-sm"
                                    >
                                        Filters
                                    </button>

                                    <button
                                        onClick={() => setSortOpen(true)}
                                        className="lg:hidden px-4 py-2 rounded-full border bg-white shadow-sm text-sm"
                                    >
                                        Sort: {sortBy === "latest" ? "Newest" :
                                            sortBy === "price-low" ? "Low → High" :
                                                "High → Low"}
                                    </button>

                                    {(selectedThemes.length || inStockOnly || minPrice !== '' || maxPrice !== '') && (
                                        <button
                                            onClick={clearAll}
                                            className="lg:hidden px-3 py-2 rounded-full text-sm bg-red-50 text-red-600 border border-red-200"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>

                                {/* ✅ NEW PRODUCT COUNT */}
                                <div className="text-sm text-slate-600">
                                    Showing{" "}
                                    <span className="font-semibold text-slate-900">
                                        {Math.min((page - 1) * perPage + 1, total)}–
                                        {Math.min(page * perPage, total)}
                                    </span>{" "}
                                    of{" "}
                                    <span className="font-semibold text-slate-900">
                                        {total}
                                    </span>{" "}
                                    products
                                </div>

                            </div>

                            {/* RIGHT SIDE (unchanged) */}
                            <div className="hidden lg:flex items-center gap-3">
                                <span className="text-sm text-slate-500">Per page</span>

                                <select
                                    value={perPage}
                                    onChange={(e) => {
                                        const params = new URLSearchParams(searchParams.toString())
                                        params.set('limit', e.target.value)
                                        params.set('page', '1')

                                        router.push(`/products?${params.toString()}`)
                                    }}
                                    className="text-sm px-3 py-1 border rounded-md bg-white"
                                >
                                    {perPageOptions.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            </div>

                        </div>

                        {/* PRODUCT GRID */}
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                {Array.from({ length: perPage }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="animate-pulse bg-white rounded-xl p-4 h-64"
                                    />

                                ))}
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-rose-600 font-medium">
                                    Unable to load products
                                </p>

                                <p className="text-sm text-slate-600 mt-2">
                                    {error}
                                </p>
                            </div>
                        ) : (
                            <>
                                <ProductGrid products={pageItems} />

                                {totalPages > 1 && (
                                    <div className="mt-10 flex justify-center">
                                        <Pagination
                                            page={page}
                                            totalPages={totalPages}
                                            onPageChange={(p) => {

                                                const params = new URLSearchParams(searchParams.toString())
                                                params.set('page', String(p))

                                                router.push(`/products?${params.toString()}`)

                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>

            {/* MOBILE FILTER DRAWER */}
            <AnimatePresence>
                {filtersOpen && (
                    <motion.div
                        className="fixed inset-0 z-50 bg-white p-6 overflow-y-auto lg:hidden"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold">Filters</h2>

                            <button
                                onClick={() => setFiltersOpen(false)}
                                className="px-3 py-1 border rounded-md text-sm"
                            >
                                Close
                            </button>
                        </div>

                        <SidebarFilters
                            q={qState}
                            onQChange={setQState}
                            inStockOnly={inStockOnly}
                            onToggleInStock={() => setInStockOnly((s) => !s)}

                            masterOptions={masterCategories.map(m => ({
                                id: m._id,
                                label: m.publicName ?? m.name ?? ''
                            }))}

                            superOptions={superCategories.map(s => ({
                                id: s._id,
                                label: s.publicName ?? s.name ?? ''
                            }))}

                            categoryOptions={categories.map(c => ({
                                id: c._id,
                                label: c.publicName ?? c.name ?? ''
                            }))}

                            subOptions={subCategories.map(s => ({
                                id: s._id,
                                label: s.publicName ?? s.name ?? ''
                            }))}

                            ageOptions={ageGroups.map(a => ({
                                id: a._id,
                                label: a.publicName ?? a.name ?? ''
                            }))}

                            themeOptions={themes
                                .map(t => ({
                                    id: t._id,
                                    label: t.publicName ?? t.name ?? '',
                                    count: themeCounts.get(t._id) ?? 0
                                }))
                                .filter(t => t.count > 0)
                            }

                            selectedMasters={selectedMasters}
                            selectedSupers={selectedSupers}
                            selectedCategories={selectedCategories}
                            selectedSubs={selectedSubs}
                            selectedAges={selectedAges}
                            selectedThemes={selectedThemes}

                            minPrice={minPrice}
                            maxPrice={maxPrice}
                            onMinPriceChange={setMinPrice}
                            onMaxPriceChange={setMaxPrice}

                            priceRangeMin={priceStats.min}
                            priceRangeMax={priceStats.max}

                            onToggleMaster={(id) => toggle(selectedMasters, setSelectedMasters, id)}
                            onToggleSuper={(id) => toggle(selectedSupers, setSelectedSupers, id)}
                            onToggleCategory={(id) => toggle(selectedCategories, setSelectedCategories, id)}
                            onToggleSub={(id) => toggle(selectedSubs, setSelectedSubs, id)}
                            onToggleAge={(id) => toggle(selectedAges, setSelectedAges, id)}
                            onToggleTheme={toggleTheme}

                            onClearAll={clearAll}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MOBILE SORT PANEL */}
            <AnimatePresence>
                {sortOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black/40 z-50 lg:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="absolute bottom-0 w-full bg-white rounded-t-2xl p-6"
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                        >

                            <h3 className="text-lg font-semibold mb-4">
                                Sort products
                            </h3>

                            <div className="flex flex-col gap-3">

                                <button
                                    onClick={() => {
                                        setSortBy("latest")
                                        setSortOpen(false)
                                    }}
                                    className="text-left py-2"
                                >
                                    Newest
                                </button>

                                <button
                                    onClick={() => {
                                        setSortBy("price-low")
                                        setSortOpen(false)
                                    }}
                                    className="text-left py-2"
                                >
                                    Price: Low to High
                                </button>

                                <button
                                    onClick={() => {
                                        setSortBy("price-high")
                                        setSortOpen(false)
                                    }}
                                    className="text-left py-2"
                                >
                                    Price: High to Low
                                </button>

                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}