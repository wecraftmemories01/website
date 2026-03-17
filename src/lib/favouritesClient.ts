import { addFavouriteAPI, fetchFavouritesAPI, removeFavouriteAPI } from './favourites'

type Subscriber = () => void

const GUEST_KEY = "wcm_guest_favourites_v1";

function getGuestFavourites(): string[] {
    try {
        const raw = localStorage.getItem(GUEST_KEY);
        try {
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    } catch {
        return [];
    }
}

function setGuestFavourites(list: string[]) {
    localStorage.setItem(GUEST_KEY, JSON.stringify(list));
}

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
        if (typeof window === "undefined") return false;

        const token = localStorage.getItem("accessToken");

        // GUEST
        if (!token) {
            const guest = getGuestFavourites();
            return guest.includes(String(productId));
        }

        // LOGGED IN
        if (!this.cache) return false;

        return this.cache.some(
            (it) => String(it.productId ?? it.product?._id ?? it.product) === String(productId)
        );
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
        if (typeof window === "undefined") return { success: false };

        const token = localStorage.getItem("accessToken");
        const authRaw = localStorage.getItem("auth");
        const customerId = authRaw ? JSON.parse(authRaw)?.customerId : null;

        // ================= GUEST =================
        if (!token || !customerId) {
            const guest = getGuestFavourites();

            if (!guest.includes(productId)) {
                guest.push(productId);
                setGuestFavourites(guest);
            }

            this.notify();
            return { success: true };
        }

        // ================= LOGGED IN =================
        const addRes = await addFavouriteAPI(customerId, productId, token);

        if (!addRes.success) {
            if (String(addRes.message).includes("401")) {
                this.cache = null;
                this.notify();
            }
            return { success: false, message: addRes.message };
        }

        await this.refreshFromServer(customerId, token);
        return { success: true };
    }

    /** Remove favourite via API (requires auth). After delete - refresh server cache once. */
    async remove(productId: string): Promise<{ success: boolean; message?: string }> {
        if (typeof window === "undefined") return { success: false };

        const token = localStorage.getItem("accessToken");
        const authRaw = localStorage.getItem("auth");
        const customerId = authRaw ? JSON.parse(authRaw)?.customerId : null;

        // ================= GUEST =================
        if (!token || !customerId) {
            const guest = getGuestFavourites().filter(id => id !== productId);
            setGuestFavourites(guest);
            this.notify();
            return { success: true };
        }

        // ================= LOGGED IN =================
        let favId: string | null = null;

        if (this.cache) {
            const found = this.cache.find(
                (it) => String(it.productId ?? it.product?._id ?? it.product) === String(productId)
            );
            favId = found?._id ?? found?.favouriteId ?? null;
        }

        if (!favId) {
            await this.refreshFromServer(customerId, token);
            const found = this.cache?.find(
                (it) => String(it.productId ?? it.product?._id ?? it.product) === String(productId)
            );
            favId = found?._id ?? found?.favouriteId ?? null;
        }

        if (!favId) return { success: false };

        const delRes = await removeFavouriteAPI(favId, token);
        if (!delRes.success) return { success: false };

        await this.refreshFromServer(customerId, token);
        return { success: true };
    }

    async syncGuestToServer() {
        if (typeof window === "undefined") return;

        const token = localStorage.getItem("accessToken");
        const authRaw = localStorage.getItem("auth");
        const customerId = authRaw ? JSON.parse(authRaw)?.customerId : null;

        if (!token || !customerId) return;

        const guest = getGuestFavourites();
        if (!guest.length) return;

        // ✅ fetch server favourites first
        await this.refreshFromServer(customerId, token);

        const existingIds = new Set(
            (this.cache || []).map(it =>
                String(it.productId ?? it.product?._id ?? it.product)
            )
        );

        // ✅ only add missing ones
        for (const productId of guest) {
            if (existingIds.has(String(productId))) continue;

            try {
                await addFavouriteAPI(customerId, productId, token);
            } catch { }
        }

        localStorage.removeItem(GUEST_KEY);

        await this.refreshFromServer(customerId, token);
        this.notify();
    }

    /** expose cached server favourites copy */
    getServerCache(): any[] {
        return this.cache ? [...this.cache] : []
    }
}

const client = new FavouritesClient()
export default client