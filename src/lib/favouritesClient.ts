import { addFavouriteAPI, fetchFavouritesAPI, removeFavouriteAPI } from './favourites'

type Subscriber = () => void

class FavouritesClient {
    private subscribers = new Set<Subscriber>()
    private inflightPromise: Promise<any> | null = null
    private cache: any[] | null = null // server favourites array (normalized items)

    init() {
        if (typeof window === 'undefined') return
        // listen for accessToken/customerId changes in other tabs; refresh/clear accordingly
        window.addEventListener('storage', this.onStorageEvent)
        // initial attempt: if token present, fetch favourites
        this.refreshFromServerIfAuthorized().catch(() => {
            // ignore network failures at init
        })
    }

    destroy() {
        if (typeof window === 'undefined') return
        window.removeEventListener('storage', this.onStorageEvent)
        this.subscribers.clear()
        this.inflightPromise = null
        this.cache = null
    }

    private onStorageEvent = (ev: StorageEvent) => {
        if (ev.key === 'accessToken' || ev.key === 'customerId') {
            const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
            const customerId = typeof window !== 'undefined' ? localStorage.getItem('customerId') : null

            if (!token || !customerId) {
                // logged out or token removed: clear in-memory cache and notify
                this.cache = null
                this.notify()
            } else {
                // token added/changed: refresh from server
                this.refreshFromServer(customerId, token).catch(() => { })
            }
        }
    }

    subscribe(fn: Subscriber) {
        this.subscribers.add(fn)
    }

    unsubscribe(fn: Subscriber) {
        this.subscribers.delete(fn)
    }

    private notify() {
        this.subscribers.forEach((s) => {
            try {
                s()
            } catch {
                // ignore errors in subscribers
            }
        })
    }

    /** Only call GET if token & customerId present */
    async refreshFromServerIfAuthorized(): Promise<void> {
        if (typeof window === 'undefined') return
        const token = localStorage.getItem('accessToken')
        const authRaw = localStorage.getItem('auth')
        const customerId = authRaw ? JSON.parse(authRaw)?.customerId : null
        if (!token || !customerId) return
        await this.refreshFromServer(customerId, token)
    }

    /** Fetch server favourites and populate in-memory cache.
     *  Uses a single inflight promise to dedupe concurrent calls.
     */
    async refreshFromServer(customerId?: string, token?: string | null): Promise<void> {
        if (typeof window === 'undefined') return
        if (!customerId) {
            const authRaw = localStorage.getItem('auth')
            customerId = authRaw ? JSON.parse(authRaw)?.customerId : undefined
        }
        if (!token) token = localStorage.getItem('accessToken')

        if (!customerId || !token) {
            // can't fetch without auth
            this.cache = null
            this.notify()
            return
        }

        if (this.inflightPromise) return this.inflightPromise
        this.inflightPromise = (async () => {
            try {
                const res = await fetchFavouritesAPI(customerId!, undefined, token)
                if (!res.success) {
                    // if API indicates unauthorized (helper returns message containing '401') clear cache
                    if (String(res.message).includes('401')) {
                        this.cache = null
                        this.notify()
                        this.inflightPromise = null
                        return
                    }
                    // other failures => keep old cache (do not overwrite with empty)
                    this.inflightPromise = null
                    return
                }

                // store normalized in-memory cache
                this.cache = Array.isArray(res.data) ? res.data : []
                this.notify()
            } catch {
                // network error: keep previous cache
            } finally {
                this.inflightPromise = null
            }
        })()
        return this.inflightPromise
    }

    /** Is the product favourited? */
    isFavourite(productId: string): boolean {
        if (!this.cache) return false
        return this.cache.some((it) => String(it.productId ?? it.product?._id ?? it.product) === String(productId))
    }

    /** Toggle favourite: add or remove */
    async toggle(productId: string): Promise<{ success: boolean; message?: string }> {
        if (this.isFavourite(productId)) {
            return this.remove(productId)
        } else {
            return this.add(productId)
        }
    }

    /** Add favourite via API (requires auth). After add - refresh server cache once. */
    async add(productId: string): Promise<{ success: boolean; message?: string }> {
        if (typeof window === 'undefined') return { success: false, message: 'no window' }
        const token = localStorage.getItem('accessToken')
        const authRaw = localStorage.getItem('auth')
        const customerId = authRaw ? JSON.parse(authRaw)?.customerId : null
        if (!token || !customerId) {
            return { success: false, message: 'not_authenticated' }
        }

        const addRes = await addFavouriteAPI(customerId, productId, token)
        if (!addRes.success) {
            // if 401-like error, clear cache
            if (String(addRes.message).includes('401')) {
                this.cache = null
                this.notify()
            }
            return { success: false, message: addRes.message }
        }

        // refresh from server once and notify subscribers
        await this.refreshFromServer(customerId, token)
        return { success: true }
    }

    /** Remove favourite via API (requires auth). After delete - refresh server cache once. */
    async remove(productId: string): Promise<{ success: boolean; message?: string }> {
        if (typeof window === 'undefined') return { success: false, message: 'no window' }
        const token = localStorage.getItem('accessToken')
        const authRaw = localStorage.getItem('auth')
        const customerId = authRaw ? JSON.parse(authRaw)?.customerId : null
        if (!token || !customerId) {
            return { success: false, message: 'not_authenticated' }
        }

        // Need favouriteId to delete. Try to find in cache.
        let favId: string | null = null
        if (this.cache) {
            const found = this.cache.find((it) => String(it.productId ?? it.product?._id ?? it.product) === String(productId))
            favId = found?._id ?? found?.favouriteId ?? null
        }

        if (!favId) {
            // If we don't have it in cache, refresh cache first then try again
            await this.refreshFromServer(customerId, token)
            if (this.cache) {
                const found = this.cache.find((it) => String(it.productId ?? it.product?._id ?? it.product) === String(productId))
                favId = found?._id ?? found?.favouriteId ?? null
            }
        }

        if (!favId) {
            return { success: false, message: 'favourite_id_not_found' }
        }

        const delRes = await removeFavouriteAPI(favId, token)
        if (!delRes.success) {
            if (String(delRes.message).includes('401')) {
                this.cache = null
                this.notify()
            }
            return { success: false, message: delRes.message }
        }

        // refresh cache once
        await this.refreshFromServer(customerId, token)
        return { success: true }
    }

    /** expose cached server favourites copy */
    getServerCache(): any[] {
        return this.cache ? [...this.cache] : []
    }
}

const client = new FavouritesClient()
export default client