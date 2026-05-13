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

type FilterItem = {
    _id: string
    publicName?: string
    name?: string
    productCount?: number
    isSelected?: boolean
    isAvailable?: boolean
}

type FilterGroup = {
    selected: FilterItem[]
    unselected: FilterItem[]
}

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

        const categoryParam = searchParams.get('category')

        if (!categoryParam) {
            setSelectedCategories([])
            return
        }

        setSelectedCategories(categoryParam.split(','))

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

    const [products, setProducts] = useState<Product[]>([])
    const [productIds, setProductIds] = useState<string[]>([])
    const [totalRecords, setTotalRecords] = useState(0)
    const [filtersLoading, setFiltersLoading] = useState(false)
    const [productsLoading, setProductsLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // lists for filters (master lists from API)
    const [masterCategories, setMasterCategories] = useState<FilterGroup>({
        selected: [],
        unselected: []
    })

    const [superCategories, setSuperCategories] = useState<FilterGroup>({
        selected: [],
        unselected: []
    })

    const [categories, setCategories] = useState<FilterGroup>({
        selected: [],
        unselected: []
    })

    const [subCategories, setSubCategories] = useState<FilterGroup>({
        selected: [],
        unselected: []
    })

    const [ageGroups, setAgeGroups] = useState<FilterGroup>({
        selected: [],
        unselected: []
    })

    const [themes, setThemes] = useState<FilterGroup>({
        selected: [],
        unselected: []
    })

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
    const mergeFilterGroup = (
        group?: FilterGroup
    ): FilterItem[] => {

        if (!group) return []

        return [
            ...(group.selected ?? []),
            ...(group.unselected ?? [])
        ]
    }
    const perPageOptions = [16, 32, 64]

    const safeDateMs = (s?: string | null) => {
        if (!s) return 0
        const t = Date.parse(s)
        return Number.isNaN(t) ? 0 : t
    }

    /*****************************************************************
 * FILTER API
 *****************************************************************/
    useEffect(() => {

        let mounted = true

        async function fetchFilters() {

            try {

                setFiltersLoading(true)
                setError(null)

                const params = new URLSearchParams()

                if (qState) {
                    params.set('q', qState)
                }

                if (selectedThemes.length) {
                    params.set('themeIds', selectedThemes.join(','))
                }

                const masterParam = searchParams.get('master')

                if (masterParam) {
                    params.set('masterCategoryIds', masterParam)
                }

                const superParam = searchParams.get('super')

                if (superParam) {
                    params.set('superCategoryIds', superParam)
                }

                const categoryParam = searchParams.get('category')

                if (categoryParam) {
                    params.set('categoryIds', categoryParam)
                }

                const subParam = searchParams.get('sub')

                if (subParam) {
                    params.set('subCategoryIds', subParam)
                }

                if (selectedAges.length) {
                    params.set('ageGroupIds', selectedAges.join(','))
                }

                if (debouncedMin !== '') {
                    params.set('priceFrom', String(debouncedMin))
                }

                if (debouncedMax !== '') {
                    params.set('priceTo', String(debouncedMax))
                }

                const response = await fetch(
                    `${API_BASE}/product/sell_product_filter?${params.toString()}`
                )

                const json = await response.json()

                if (!mounted) return

                setProductIds(json.productIds ?? [])

                setTotalRecords(json.totalProducts ?? 0)

                setMasterCategories(json.masterCategories ?? [])
                setSuperCategories(json.superCategories ?? [])
                setCategories(json.categories ?? [])
                setSubCategories(json.subCategories ?? [])
                setAgeGroups(json.ageGroups ?? [])
                setThemes(json.themes ?? [])

            } catch (err: any) {

                console.error(err)

                setError(err?.message ?? 'Failed to load filters')

            } finally {

                if (mounted) {
                    setFiltersLoading(false)
                }
            }
        }

        fetchFilters()

        return () => {
            mounted = false
        }

    }, [
        qState,
        selectedThemes,
        selectedMasters,
        selectedSupers,
        selectedCategories,
        selectedSubs,
        selectedAges,
        debouncedMin,
        debouncedMax
    ])

    /*****************************************************************
 * PRODUCT API
 *****************************************************************/
    useEffect(() => {

        let mounted = true

        async function fetchProducts() {

            if (filtersLoading) {
                return
            }

            try {

                setProductsLoading(true)
                setError(null)

                const params = new URLSearchParams()

                params.set('page', String(page))
                params.set('limit', String(perPage))

                if (productIds.length) {
                    params.set('ids', productIds.join(','))
                }

                const response = await fetch(
                    `${API_BASE}/product/sell?${params.toString()}`
                )

                const json = await response.json()

                if (!mounted) return

                setProducts(json.productData ?? [])

                setTotalRecords(json.totalRecords ?? 0)

            } catch (err: any) {

                console.error(err)

                setError(err?.message ?? 'Failed to load products')

            } finally {

                if (mounted) {
                    setProductsLoading(false)

                    if (initialLoading) {
                        setInitialLoading(false)
                    }
                }
            }
        }

        fetchProducts()

        return () => {
            mounted = false
        }

    }, [
        productIds,
        page,
        perPage
    ])

    const priceStats = {
        min: 1,
        max: 10000
    }

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedMin(minPrice)
            setDebouncedMax(maxPrice)
        }, 150)

        return () => clearTimeout(t)
    }, [minPrice, maxPrice])

    const total = totalRecords
    const totalPages = Math.ceil(totalRecords / perPage)

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
        // reset all local state FIRST (instant UI update)
        setSelectedMasters([])
        setSelectedSupers([])
        setSelectedCategories([])
        setSelectedSubs([])
        setSelectedAges([])
        setSelectedThemes([])

        setMinPrice('')
        setMaxPrice('')
        setDebouncedMin('')
        setDebouncedMax('')

        setQState('')
        setInStockOnly(false)

        // then clear URL
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

                            masterOptions={mergeFilterGroup(masterCategories).map((m: any) => ({
                                id: m._id,
                                label: m.publicName ?? m.name ?? '',
                                count: m.productCount ?? 0
                            }))}

                            superOptions={mergeFilterGroup(superCategories).map((s: any) => ({
                                id: s._id,
                                label: s.publicName ?? s.name ?? '',
                                count: s.productCount ?? 0
                            }))}

                            categoryOptions={mergeFilterGroup(categories).map((c: any) => ({
                                id: c._id,
                                label: c.publicName ?? c.name ?? '',
                                count: c.productCount ?? 0
                            }))}

                            subOptions={mergeFilterGroup(subCategories).map((s: any) => ({
                                id: s._id,
                                label: s.publicName ?? s.name ?? '',
                                count: s.productCount ?? 0
                            }))}

                            ageOptions={mergeFilterGroup(ageGroups).map((a: any) => ({
                                id: a._id,
                                label: a.publicName ?? a.name ?? '',
                                count: a.productCount ?? 0
                            }))}

                            themeOptions={mergeFilterGroup(themes).map((t: any) => ({
                                id: t._id,
                                label: t.publicName ?? t.name ?? '',
                                count: t.productCount ?? 0
                            }))}

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
                            onToggleCategory={(id) => {

                                const params = new URLSearchParams(searchParams.toString())

                                let next: string[]

                                if (selectedCategories.includes(id)) {

                                    next = selectedCategories.filter(x => x !== id)

                                } else {

                                    next = [...selectedCategories, id]
                                }

                                setSelectedCategories(next)

                                if (next.length === 0) {
                                    params.delete('category')
                                } else {
                                    params.set('category', next.join(','))
                                }

                                params.set('page', '1')

                                router.push(`/products?${params.toString()}`)
                            }}
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
                            <div className="flex flex-col gap-3">

                                {/* ROW 1 → FILTER + SORT */}
                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                    <button
                                        onClick={() => setFiltersOpen(true)}
                                        className="lg:hidden px-4 py-2 rounded-full border bg-white shadow-sm text-sm whitespace-nowrap"
                                    >
                                        Filters
                                    </button>

                                    <button
                                        onClick={() => setSortOpen(true)}
                                        className="lg:hidden px-4 py-2 rounded-full border bg-white shadow-sm text-sm whitespace-nowrap"
                                    >
                                        Sort: {sortBy === "latest" ? "Newest" :
                                            sortBy === "price-low" ? "Low → High" :
                                                "High → Low"}
                                    </button>

                                    {(selectedThemes.length || inStockOnly || minPrice !== '' || maxPrice !== '') && (
                                        <button
                                            onClick={clearAll}
                                            className="lg:hidden px-3 py-2 rounded-full text-sm bg-red-50 text-red-600 border border-red-200 whitespace-nowrap"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>

                                {/* ROW 2 → PRODUCT COUNT */}
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
                        {initialLoading ? (

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

                            <div className="relative">

                                {/* LOADING OVERLAY */}
                                {productsLoading && (
                                    <div className="absolute inset-0 z-10 bg-transparent backdrop-blur-[1px] rounded-xl flex items-center justify-center">

                                        <div className="flex items-center gap-2 px-4 py-2 bg-white border rounded-full shadow-md">

                                            <div className="w-4 h-4 border-2 border-[#0B5C73] border-t-transparent rounded-full animate-spin" />

                                            <span className="text-sm font-medium text-slate-700">
                                                Updating products...
                                            </span>

                                        </div>

                                    </div>
                                )}

                                <div>

                                    <ProductGrid products={products} />

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

                                </div>

                            </div>

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

                            masterOptions={mergeFilterGroup(masterCategories).map(m => ({
                                id: m._id,
                                label: m.publicName ?? m.name ?? ''
                            }))}

                            superOptions={mergeFilterGroup(superCategories).map(s => ({
                                id: s._id,
                                label: s.publicName ?? s.name ?? ''
                            }))}

                            categoryOptions={mergeFilterGroup(categories).map((c: any) => ({
                                id: c._id,
                                label: c.publicName ?? c.name ?? '',
                                count: c.productCount ?? 0
                            }))}

                            subOptions={mergeFilterGroup(subCategories).map(s => ({
                                id: s._id,
                                label: s.publicName ?? s.name ?? ''
                            }))}

                            ageOptions={mergeFilterGroup(ageGroups).map(a => ({
                                id: a._id,
                                label: a.publicName ?? a.name ?? ''
                            }))}

                            themeOptions={mergeFilterGroup(themes).map((t: any) => ({
                                id: t._id,
                                label: t.publicName ?? t.name ?? '',
                                count: t.productCount ?? 0
                            }))}

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
                            onToggleCategory={(id) => {

                                const params = new URLSearchParams(searchParams.toString())

                                let next: string[]

                                if (selectedCategories.includes(id)) {

                                    next = selectedCategories.filter(x => x !== id)

                                } else {

                                    next = [...selectedCategories, id]
                                }

                                setSelectedCategories(next)

                                if (next.length === 0) {
                                    params.delete('category')
                                } else {
                                    params.set('category', next.join(','))
                                }

                                params.set('page', '1')

                                router.push(`/products?${params.toString()}`)
                            }}
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
                        onClick={() => setSortOpen(false)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="absolute bottom-0 w-full bg-white rounded-t-2xl p-6"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                        >
                            {/* HEADER */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Sort products</h3>

                                <button
                                    onClick={() => setSortOpen(false)}
                                    className="text-sm px-3 py-1 border rounded-md"
                                >
                                    Close
                                </button>
                            </div>

                            {/* OPTIONS */}
                            <div className="flex flex-col gap-3">

                                <button
                                    onClick={() => {
                                        setSortBy("latest")
                                        setSortOpen(false)
                                    }}
                                    className={`text-left py-2 ${sortBy === "latest" ? "font-semibold text-[#0B5C73]" : ""}`}
                                >
                                    Newest
                                </button>

                                <button
                                    onClick={() => {
                                        setSortBy("price-low")
                                        setSortOpen(false)
                                    }}
                                    className={`text-left py-2 ${sortBy === "price-low" ? "font-semibold text-[#0B5C73]" : ""}`}
                                >
                                    Price: Low to High
                                </button>

                                <button
                                    onClick={() => {
                                        setSortBy("price-high")
                                        setSortOpen(false)
                                    }}
                                    className={`text-left py-2 ${sortBy === "price-high" ? "font-semibold text-[#0B5C73]" : ""}`}
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