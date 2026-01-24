'use client'

import React, { useEffect, useMemo, useState } from 'react'
import ProductGrid from './ProductGrid'
import Pagination from './ui/Pagination'
import type { Product } from '../types/product'
import SidebarFilters from './SidebarFilters'
import { useSearchParams } from 'next/navigation' // <-- added

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/v1'

type IdLabel = { _id: string; publicName?: string; name?: string }

export default function ProductsClient() {
    const searchParams = useSearchParams() // read query params
    const [products, setProducts] = useState<Product[]>([])
    const [filtered, setFiltered] = useState<Product[]>([])
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
    const [q, setQ] = useState('')
    const [selectedMasters, setSelectedMasters] = useState<string[]>([])
    const [selectedSupers, setSelectedSupers] = useState<string[]>([])
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [selectedSubs, setSelectedSubs] = useState<string[]>([])
    const [selectedAges, setSelectedAges] = useState<string[]>([])
    const [selectedThemes, setSelectedThemes] = useState<string[]>([])
    const [inStockOnly, setInStockOnly] = useState(false)

    const [page, setPage] = useState(1)
    const perPageOptions = [8, 12, 16]
    const [perPage, setPerPage] = useState<number>(8)

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
                const [pRes, mRes, sRes, cRes, subRes, ageRes, themeRes] = await Promise.all([
                    fetch(`${API_BASE}/product/sell`),
                    fetch(`${API_BASE}/master_category`),
                    fetch(`${API_BASE}/super_category`),
                    fetch(`${API_BASE}/category`),
                    fetch(`${API_BASE}/sub_category`),
                    fetch(`${API_BASE}/age_group`),
                    fetch(`${API_BASE}/theme`),
                ])

                const [pJson, mJson, sJson, cJson, subJson, ageJson, themeJson] = await Promise.all([
                    pRes.json().catch(() => ({})),
                    mRes.json().catch(() => ({})),
                    sRes.json().catch(() => ({})),
                    cRes.json().catch(() => ({})),
                    subRes.json().catch(() => ({})),
                    ageRes.json().catch(() => ({})),
                    themeRes.json().catch(() => ({})),
                ])

                if (!mounted) return

                setProducts(Array.isArray(pJson?.productData) ? pJson.productData : [])

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
    }, [])

    // If URL contains ?q=..., set the page search field to that value.
    // useSearchParams returns a reactive object — include its string representation to trigger effect when params change.
    useEffect(() => {
        const urlQ = searchParams?.get('q') ?? ''
        // only update if different to avoid stomping user typing
        if (urlQ !== (q ?? '')) {
            setQ(urlQ)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams?.toString()]) // intentionally depend on searchParams string

    // derive available filter options from fetched products (only show options that exist in products)
    const availableFilterSets = useMemo(() => {
        const masterSet = new Map<string, { label: string; count: number }>()
        const superSet = new Map<string, { label: string; count: number }>()
        const catSet = new Map<string, { label: string; count: number }>()
        const subSet = new Map<string, { label: string; count: number }>()
        const ageSet = new Map<string, { label: string; count: number }>()
        const themeSet = new Map<string, { label: string; count: number }>()

        products.forEach((p) => {
            if (p.masterCategoryId) {
                const id = String(p.masterCategoryId)
                masterSet.set(id, { label: p.masterCategoryPublicName ?? p.masterCategoryName ?? id, count: (masterSet.get(id)?.count ?? 0) + 1 })
            }
            if (p.superCategoryId) {
                const id = String(p.superCategoryId)
                superSet.set(id, { label: p.superCategoryPublicName ?? p.superCategoryName ?? id, count: (superSet.get(id)?.count ?? 0) + 1 })
            }
            if (p.categoryId) {
                const id = String(p.categoryId)
                catSet.set(id, { label: p.categoryPublicName ?? p.categoryName ?? id, count: (catSet.get(id)?.count ?? 0) + 1 })
            }
            if (p.subCategoryId) {
                const id = String(p.subCategoryId)
                subSet.set(id, { label: p.subCategoryPublicName ?? p.subCategoryName ?? id, count: (subSet.get(id)?.count ?? 0) + 1 })
            }
            // ageGroupId or themeId might not exist on product — attempt by name fields too
            if ((p as any).ageGroupId) {
                const id = String((p as any).ageGroupId)
                ageSet.set(id, { label: String((p as any).ageGroupPublicName ?? (p as any).ageGroupName ?? id), count: (ageSet.get(id)?.count ?? 0) + 1 })
            }
            if ((p as any).themeId) {
                const id = String((p as any).themeId)
                themeSet.set(id, { label: String((p as any).themePublicName ?? (p as any).themeName ?? id), count: (themeSet.get(id)?.count ?? 0) + 1 })
            }
            // fallback: if product has theme string
            if ((p as any).theme && typeof (p as any).theme === 'string') {
                const id = String((p as any).theme).toLowerCase()
                themeSet.set(id, { label: String((p as any).theme), count: (themeSet.get(id)?.count ?? 0) + 1 })
            }
        })

        return {
            masters: masterSet,
            supers: superSet,
            cats: catSet,
            subs: subSet,
            ages: ageSet,
            themes: themeSet,
        }
    }, [products])

    // apply filters (multi-select)
    useEffect(() => {
        const term = q.trim().toLowerCase()
        let list = products.slice()

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
            list = list.filter((p: any) =>
                selectedThemes.includes(String(p.themeId ?? '')) || selectedThemes.includes(String((p.theme ?? '').toLowerCase()))
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
            list = list.filter((p) => {
                const name = (p.productName ?? '').toLowerCase()
                const sub = (p.subCategoryPublicName ?? '').toLowerCase()
                const cat = (p.categoryPublicName ?? '').toLowerCase()
                const sup = (p.superCategoryPublicName ?? '').toLowerCase()
                return name.includes(term) || sub.includes(term) || cat.includes(term) || sup.includes(term)
            })
        }

        // sort by latest
        list.sort((a, b) => {
            const aMs = Math.max(safeDateMs(a.updatedAt), safeDateMs(a.createdAt))
            const bMs = Math.max(safeDateMs(b.updatedAt), safeDateMs(b.createdAt))
            return bMs - aMs
        })

        setFiltered(list)
        setPage(1)
    }, [
        products,
        q,
        selectedMasters,
        selectedSupers,
        selectedCategories,
        selectedSubs,
        selectedAges,
        selectedThemes,
        inStockOnly,
    ])

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const pageItems = filtered.slice((page - 1) * perPage, page * perPage)

    // helpers to toggle selection arrays
    const toggle = (arr: string[], set: (v: string[]) => void, id: string) => {
        if (!id) return
        set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
    }

    const clearAll = () => {
        setQ('')
        setSelectedMasters([])
        setSelectedSupers([])
        setSelectedCategories([])
        setSelectedSubs([])
        setSelectedAges([])
        setSelectedThemes([])
        setInStockOnly(false)
    }

    // UI: show which filters are available (only those with counts)
    const toArrayWithCounts = (map: Map<string, { label: string; count: number }>) =>
        Array.from(map.entries()).map(([id, v]) => ({ id, label: v.label, count: v.count }))

    return (
        <div className="min-h-screen bg-gray-50 text-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Shop</h1>
                        <p className="text-sm text-slate-600">Handmade woolen items — interactive filters on the left.</p>
                    </div>
                    <div className="md:hidden">
                        {/* mobile: nothing fancy here */}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
                    <aside className="bg-white rounded-lg shadow-sm p-4">
                        <SidebarFilters
                            q={q}
                            onQChange={setQ}
                            inStockOnly={inStockOnly}
                            onToggleInStock={() => setInStockOnly((s) => !s)}
                            masterOptions={toArrayWithCounts(availableFilterSets.masters)}
                            superOptions={toArrayWithCounts(availableFilterSets.supers)}
                            categoryOptions={toArrayWithCounts(availableFilterSets.cats)}
                            subOptions={toArrayWithCounts(availableFilterSets.subs)}
                            ageOptions={toArrayWithCounts(availableFilterSets.ages)}
                            themeOptions={toArrayWithCounts(availableFilterSets.themes)}
                            selectedMasters={selectedMasters}
                            selectedSupers={selectedSupers}
                            selectedCategories={selectedCategories}
                            selectedSubs={selectedSubs}
                            selectedAges={selectedAges}
                            selectedThemes={selectedThemes}
                            onToggleMaster={(id) => toggle(selectedMasters, setSelectedMasters, id)}
                            onToggleSuper={(id) => toggle(selectedSupers, setSelectedSupers, id)}
                            onToggleCategory={(id) => toggle(selectedCategories, setSelectedCategories, id)}
                            onToggleSub={(id) => toggle(selectedSubs, setSelectedSubs, id)}
                            onToggleAge={(id) => toggle(selectedAges, setSelectedAges, id)}
                            onToggleTheme={(id) => toggle(selectedThemes, setSelectedThemes, id)}
                            onClearAll={clearAll}
                        />
                    </aside>

                    <main>
                        <div className="mb-4 flex items-center justify-between">
                            <div className="text-sm text-slate-600">
                                Showing <span className="font-medium">{pageItems.length}</span> of <span className="font-medium">{total}</span> products
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-xs text-slate-500 hidden sm:inline">Per page</label>
                                <select
                                    value={perPage}
                                    onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
                                    className="text-sm px-2 py-1 border rounded-md bg-white"
                                >
                                    {perPageOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {Array.from({ length: perPage }).map((_, i) => (
                                    <div key={i} className="animate-pulse bg-white rounded-xl p-4 h-64" />
                                ))}
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-rose-600 font-medium">Unable to load products</p>
                                <p className="text-sm text-slate-600 mt-2">{error}</p>
                            </div>
                        ) : total === 0 ? (
                            <div className="text-center py-16">
                                <h3 className="text-xl font-semibold">No products found</h3>
                                <p className="text-sm text-slate-500 mt-2">Change filters or clear all to see more products.</p>
                            </div>
                        ) : (
                            <>
                                <ProductGrid products={pageItems} />

                                <div className="mt-8 flex items-center justify-center">
                                    <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
                                </div>
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    )
}