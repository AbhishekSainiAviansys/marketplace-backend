/** Student session + cart/wishlist/orders — all localStorage in v1.
 * Backend student auth + order APIs land in Phase-2; the UI shape stays.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, errMsg, metaOf, rowsOf } from '@lib/api'
import { DUMMY_PRODUCTS } from '../data/products'
import type { Product } from '../data/products'

export type { Product }

export type Student = {
  name: string
  className: string
  schoolCode: string
  schoolName?: string
  whatsapp: string
  phoneCountryCode?: string
  email?: string
}

const S_KEY = 'mp-student'
const C_KEY = 'mp-cart'
const W_KEY = 'mp-wishlist'
const O_KEY = 'mp-orders'

export type CartLine = { id: string; qty: number }
export type Order = {
  id: string; items: { id: string; name: string; price: number; qty: number; image: string }[]
  total: number; payMode: string; delivery: string; address: string; date: string; status: string
}

const read = <T,>(k: string, fb: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fb } catch { return fb }
}

type ShopCtx = {
  products: Product[]; live: boolean; loading: boolean
  /** Infinite scroll on the home grid: append the next catalogue page. */
  loadingMore: boolean; hasMore: boolean; fetchMore: () => void
  /** Merge externally fetched rows (boost/random spotlight) into the catalogue. */
  mergeRows: (rows: Product[]) => void
  student: Student | null; login: (s: Student) => void; logout: () => void
  cart: CartLine[]; add: (id: string, qty?: number) => void; setQty: (id: string, qty: number) => void
  remove: (id: string) => void; clearCart: () => void
  wish: string[]; toggleWish: (id: string) => void
  cartDetailed: { p: Product; qty: number }[]; subTotal: number; mrpTotal: number; count: number
  orders: Order[]; placeOrder: (o: Omit<Order, 'id' | 'date' | 'status'>) => Order
}

const Ctx = createContext<ShopCtx | null>(null)

const toProduct = (r: Record<string, unknown>, i: number): Product => {
  const cat = r.category as { name?: string } | undefined
  const images = r.images as { url?: string; path?: string }[] | undefined
  const price = Number(r.price ?? 0)
  return {
    id: String(r.id ?? `live-${i}`),
    name: String(r.name ?? 'Product'),
    category: cat?.name ?? 'Book',
    price, mrp: Number(r.mrp ?? price),
    rating: 4.5, reviews: 50 + ((i * 37) % 300), stock: Number(r.stock ?? 10),
    image: images?.[0]?.url ?? DUMMY_PRODUCTS[i % DUMMY_PRODUCTS.length].image,
    delivery: (r.delivery_mode as Product['delivery']) ?? 'school_pickup',
    schoolCode: 'SCH001', classTag: 'All',
    blurb: String(r.name ?? 'Product'),
    specs: [{ label: 'Category', value: cat?.name ?? 'Book' }],
  }
}

/** Catalogue page size — the home grid appends these while scrolling. */
const PAGE_SIZE = 12

/** Admin-boosted "Featured picks" row (ids come from Home content settings). */
export async function fetchBoosted(ids: number[]): Promise<Product[]> {
  if (ids.length === 0) return []
  const r = await api.get('/products', { params: { ids: ids.join(',') } })
  const rows = rowsOf<Record<string, unknown>>(r.data)
  return rows.map(toProduct)
}

/** "Surprise picks" row — server-side random sample, fresh each call. */
export async function fetchRandom(n: number): Promise<Product[]> {
  const r = await api.get('/products', { params: { random: 1, per_page: Math.max(1, n) } })
  const rows = rowsOf<Record<string, unknown>>(r.data)
  return rows.map(toProduct)
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(DUMMY_PRODUCTS)
  const [live, setLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<Student | null>(() => read<Student | null>(S_KEY, null))
  const [cart, setCart] = useState<CartLine[]>(() => read<CartLine[]>(C_KEY, []))
  const [wish, setWish] = useState<string[]>(() => read<string[]>(W_KEY, []))
  const [orders, setOrders] = useState<Order[]>(() => read<Order[]>(O_KEY, []))
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const liveRef = useRef(false)

  useEffect(() => {
    let alive = true
    api.get('/products', { params: { per_page: PAGE_SIZE, page: 1 } })
      .then((r) => {
        if (!alive) return
        const rows = rowsOf<Record<string, unknown>>(r.data?.data ?? r.data)
        setLastPage(metaOf(r.data).lastPage)
        if (rows.length > 0) { setProducts(rows.map(toProduct)); setLive(true); liveRef.current = true }
      })
      .catch(() => { /* offline catalogue — dummy list stays */ })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  /** Append the next catalogue page — drives the home grid's infinite scroll. */
  const fetchMore = async () => {
    if (!liveRef.current || loadingMore || page >= lastPage) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const r = await api.get('/products', { params: { per_page: PAGE_SIZE, page: next } })
      const rows = rowsOf<Record<string, unknown>>(r.data?.data ?? r.data)
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        const add = rows.map(toProduct).filter((p) => !seen.has(p.id))
        return add.length > 0 ? [...prev, ...add] : prev
      })
      setPage(next)
      setLastPage(Math.max(next, metaOf(r.data).lastPage))
    } catch { /* network hiccup — keep what we have */ }
    finally { setLoadingMore(false) }
  }

  /** Merge spotlight rows (boost/random) so their Add-to-cart works too. */
  const mergeRows = (rows: Product[]) => {
    if (rows.length === 0) return
    setProducts((prev) => {
      const seen = new Set(prev.map((p) => p.id))
      const add = rows.filter((p) => !seen.has(p.id))
      return add.length > 0 ? [...prev, ...add] : prev
    })
  }

  useEffect(() => { localStorage.setItem(C_KEY, JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem(W_KEY, JSON.stringify(wish)) }, [wish])
  useEffect(() => { localStorage.setItem(O_KEY, JSON.stringify(orders)) }, [orders])

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  // Cart/wishlist items beyond page 1 aren't in the loaded list — hydrate them
  // by id so those pages never render empty for orders placed earlier.
  useEffect(() => {
    if (!live) return
    const missing = [...new Set([...wish, ...cart.map((l) => l.id)])].filter((id) => !byId.has(id))
    if (missing.length === 0) return
    api.get('/products', { params: { ids: missing.join(',') } })
      .then((r) => {
        const rows = rowsOf<Record<string, unknown>>(r.data).map(toProduct)
        if (rows.length > 0) {
          setProducts((prev) => {
            const seen = new Set(prev.map((p) => p.id))
            const add = rows.filter((p) => !seen.has(p.id))
            return add.length > 0 ? [...prev, ...add] : prev
          })
        }
      })
      .catch(() => { /* item simply won't render — grid stays consistent */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, wish, cart, byId])

  const cartDetailed = useMemo(
    () => cart.flatMap((l) => { const p = byId.get(l.id); return p ? [{ p, qty: l.qty }] : [] }),
    [cart, byId],
  )
  const subTotal = cartDetailed.reduce((s, l) => s + l.p.price * l.qty, 0)
  const mrpTotal = cartDetailed.reduce((s, l) => s + l.p.mrp * l.qty, 0)
  const count = cart.reduce((s, l) => s + l.qty, 0)

  const v: ShopCtx = {
    products, live, loading,
    loadingMore, hasMore: live && page < lastPage, fetchMore, mergeRows,
    student,
    login: (s) => { localStorage.setItem(S_KEY, JSON.stringify(s)); setStudent(s) },
    logout: () => { localStorage.removeItem(S_KEY); localStorage.removeItem('token'); localStorage.removeItem('user'); setStudent(null) },
    cart,
    add: (id, qty = 1) => setCart((c) => {
      const f = c.find((l) => l.id === id)
      return f ? c.map((l) => (l.id === id ? { ...l, qty: Math.min(9, l.qty + qty) } : l)) : [...c, { id, qty }]
    }),
    setQty: (id, qty) => setCart((c) => (qty <= 0 ? c.filter((l) => l.id !== id) : c.map((l) => (l.id === id ? { ...l, qty: Math.min(9, qty) } : l)))),
    remove: (id) => setCart((c) => c.filter((l) => l.id !== id)),
    clearCart: () => setCart([]),
    wish, toggleWish: (id) => setWish((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id])),
    cartDetailed, subTotal, mrpTotal, count,
    orders,
    placeOrder: (o) => {
      const order: Order = { ...o, id: `ORD${Date.now().toString().slice(-6)}`, date: new Date().toLocaleString(), status: 'Placed' }
      setOrders((prev) => [order, ...prev]); setCart([])
      return order
    },
  }
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}

export const useShop = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useShop outside provider')
  return v
}

export const rupee = (n: number) => `₹${Number(n || 0).toFixed(2)}`
export const discount = (p: Product) => (p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0)
export const deliveryLabel: Record<Product['delivery'], string> = {
  self: 'Home delivery', thirdparty: 'Courier delivery', school_pickup: 'Pickup from school',
}
export { errMsg }


