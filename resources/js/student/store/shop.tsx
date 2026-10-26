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
  id: string; items: { id: string; name: string; price: number; qty: number; image: string; courier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; shippedAt?: string | null; deliveredAt?: string | null }[]
  total: number; payMode: string; delivery: string; address: string; date: string; status: string
  orderCode?: string
  couponCode?: string | null
  couponDiscount?: number
  paymentStatus?: string | null
  placedAt?: string | null
  paidAt?: string | null
  courier?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  cancelledAt?: string | null
  refundedAt?: string | null
  adminNote?: string | null
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
  orders: Order[]; placeOrder: (o: Omit<Order, 'id' | 'date' | 'status'>) => Promise<Order>
  couponCode: string | null; couponDiscount: number; applyCoupon: (code: string, subtotal: number) => Promise<{ code: string; discount_amount: number }>; clearCoupon: () => void
}

const Ctx = createContext<ShopCtx | null>(null)

export const toProduct = (r: Record<string, unknown>, i: number): Product => {
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
    deliveryCharge: r.delivery_charge == null ? null : Number(r.delivery_charge),
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
  const [couponCode, setCouponCode] = useState<string | null>(() => read<string | null>('mp-coupon', null))
  const [couponDiscount, setCouponDiscount] = useState<number>(0)
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

  const isAuthed = () => !!localStorage.getItem('token')

const loadCartFromBackend = async () => {
  if (!isAuthed()) return
  try {
    const r = await api.get('/student/cart')
    const rows = rowsOf<{ product_id: string | number; qty: number }>(r.data)
    setCart(rows.map((x) => ({ id: String(x.product_id), qty: Number(x.qty) })))
  } catch { /* keep cached */ }
}
const loadWishlistFromBackend = async () => {
  if (!isAuthed()) return
  try {
    const r = await api.get('/student/wishlist')
    const rows = rowsOf<string | number>(r.data)
    setWish(rows.map((x) => String(x)))
  } catch { /* keep cached */ }
}

useEffect(() => {
  if (!isAuthed()) return
  void loadCartFromBackend()
  void loadWishlistFromBackend()
  void loadOrdersFromBackend()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

const loadOrdersFromBackend = async () => {
  if (!isAuthed()) return
  try {
    const r = await api.get('/student/orders')
    const rows = rowsOf<Record<string, unknown>>(r.data)
    setOrders(rows.map((row) => ({
      id: String(row.order_code ?? row.id ?? ''),
      orderCode: row.order_code ? String(row.order_code) : undefined,
      items: Array.isArray(row.items) ? (row.items as Record<string, unknown>[]).map((it, i) => ({
        id: String(it.id ?? it.product_id ?? i),
        name: String(it.name ?? it.product_name ?? 'Item'),
        price: Number(it.price ?? 0),
        qty: Number(it.qty ?? it.quantity ?? 1),
        image: String(it.image ?? ''),
        courier: it.courier ? String(it.courier) : null,
        trackingNumber: it.tracking_number ? String(it.tracking_number) : (it.trackingNumber ? String(it.trackingNumber) : null),
        trackingUrl: it.tracking_url ? String(it.tracking_url) : (it.trackingUrl ? String(it.trackingUrl) : null),
        shippedAt: it.shipped_at ? String(it.shipped_at) : (it.shippedAt ? String(it.shippedAt) : null),
        deliveredAt: it.delivered_at ? String(it.delivered_at) : (it.deliveredAt ? String(it.deliveredAt) : null),
      })) : [],
      total: Number(row.total ?? 0),
      payMode: String(row.pay_mode ?? 'Online'),
      delivery: String(row.delivery ?? ''),
      address: String(row.address ?? ''),
      date: row.placed_at ? new Date(String(row.placed_at)).toLocaleString() : (row.created_at ? new Date(String(row.created_at)).toLocaleString() : new Date().toLocaleString()),
      status: String(row.status ?? 'Placed'),
      paymentStatus: row.payment_status ? String(row.payment_status) : null,
      placedAt: row.placed_at ? String(row.placed_at) : null,
      paidAt: row.paid_at ? String(row.paid_at) : null,
      courier: row.courier ? String(row.courier) : null,
      trackingNumber: row.tracking_number ? String(row.tracking_number) : null,
      trackingUrl: row.tracking_url ? String(row.tracking_url) : null,
      shippedAt: row.shipped_at ? String(row.shipped_at) : null,
      deliveredAt: row.delivered_at ? String(row.delivered_at) : null,
      cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
      refundedAt: row.refunded_at ? String(row.refunded_at) : null,
      adminNote: row.admin_note ? String(row.admin_note) : null,
    })))
  } catch { /* keep cached */ }
}
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
    login: (s) => {
      localStorage.setItem(S_KEY, JSON.stringify(s)); setStudent(s)
      void (async () => {
        if (!localStorage.getItem('token')) return
        const localCart = read<CartLine[]>(C_KEY, [])
        const localWish = read<string[]>(W_KEY, [])
        if (localCart.length) {
          await api.delete('/student/cart').catch(() => {})
          for (const l of localCart) {
            await api.post('/student/cart/items', { product_id: Number(l.id), qty: l.qty }).catch(() => {})
          }
          localStorage.removeItem(C_KEY)
        }
        if (localWish.length) {
          for (const id of localWish) {
            await api.post(`/student/wishlist/${id}`).catch(() => {})
          }
          localStorage.removeItem(W_KEY)
        }
        await loadCartFromBackend()
        await loadWishlistFromBackend()
        await loadOrdersFromBackend()
      })()
    },
    logout: () => { localStorage.removeItem(S_KEY); localStorage.removeItem('token'); localStorage.removeItem('user'); setStudent(null); setCart([]); setWish([]); setOrders([]); setCouponCode(null); setCouponDiscount(0); try { localStorage.removeItem('mp-coupon') } catch {} },
    cart,
    add: (id, qty = 1) => {
      if (!isAuthed()) {
        setCart((c) => {
          const p = byId.get(id)
          const maxQty = p ? Math.min(9, Math.max(0, p.stock)) : 9
          if (maxQty <= 0) return c
          const f = c.find((l) => l.id === id)
          if (f) return c.map((l) => (l.id === id ? { ...l, qty: Math.min(maxQty, l.qty + qty) } : l))
          return [...c, { id, qty: Math.min(qty, maxQty) }]
        })
        return
      }
      void (async () => {
        try { await api.post('/student/cart/items', { product_id: Number(id), qty }) } catch {}
        await loadCartFromBackend()
      })()
    },
    setQty: (id, qty) => {
      if (!isAuthed()) {
        setCart((c) => {
          const p = byId.get(id)
          const maxQty = p ? Math.min(9, Math.max(0, p.stock)) : 9
          if (qty <= 0 || maxQty <= 0) return c.filter((l) => l.id !== id)
          return c.map((l) => (l.id === id ? { ...l, qty: Math.min(maxQty, qty) } : l))
        })
        return
      }
      void (async () => {
        try {
          if (qty <= 0) await api.delete(`/student/cart/items/${id}`)
          else await api.patch(`/student/cart/items/${id}`, { qty })
        } catch {}
        await loadCartFromBackend()
      })()
    },
    remove: (id) => {
      if (!isAuthed()) { setCart((c) => c.filter((l) => l.id !== id)); return }
      void (async () => {
        try { await api.delete(`/student/cart/items/${id}`) } catch {}
        await loadCartFromBackend()
      })()
    },
    clearCart: () => {
      if (!isAuthed()) { setCart([]); return }
      void (async () => {
        try { await api.delete('/student/cart') } catch {}
        setCart([])
      })()
    },
    wish, toggleWish: (id) => {
      if (!isAuthed()) {
        setWish((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]))
        return
      }
      void (async () => {
        try {
          if (wish.includes(id)) await api.delete(`/student/wishlist/${id}`)
          else await api.post(`/student/wishlist/${id}`)
        } catch {}
        await loadWishlistFromBackend()
      })()
    },
    cartDetailed, subTotal, mrpTotal, count,
    orders,
    couponCode,
    couponDiscount,
    applyCoupon: async (code, subtotal) => {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Login required')
      const res = await api.post('/student/coupons/validate', { code, subtotal })
      const data = res.data as { code: string; discount_amount: number }
      setCouponCode(data.code)
      setCouponDiscount(Number(data.discount_amount || 0))
      try { localStorage.setItem('mp-coupon', JSON.stringify(data.code)) } catch {}
      return { code: data.code, discount_amount: Number(data.discount_amount || 0) }
    },
    clearCoupon: () => {
      setCouponCode(null)
      setCouponDiscount(0)
      try { localStorage.removeItem('mp-coupon') } catch {}
    },

    placeOrder: async (o) => {
      const token = localStorage.getItem('token')
      let created: Record<string, unknown> | null = null
      if (token) {
        const res = await api.post('/student/orders', {
          items: o.items.map((it) => ({ id: Number(it.id), name: it.name, qty: it.qty, price: it.price, image: it.image })),
          total: o.total,
          pay_mode: o.payMode,
          delivery: o.delivery,
          address: o.address,
          status: 'Placed',
          payment_status: 'paid',
          coupon_code: o.couponCode ?? couponCode ?? undefined,
        })
        created = (res.data ?? null) as Record<string, unknown> | null
        if (localStorage.getItem('token')) {
          try { await api.delete('/student/cart') } catch {}
          await loadCartFromBackend()
        }
      }
      const order: Order = created ? {
        id: String(created.order_code ?? created.id ?? `ORD${Date.now().toString().slice(-6)}`),
        orderCode: created.order_code ? String(created.order_code) : undefined,
        items: o.items,
        total: Number(created.total ?? o.total),
        payMode: String(created.pay_mode ?? o.payMode),
        delivery: String(created.delivery ?? o.delivery),
        address: String(created.address ?? o.address),
        couponCode: created.coupon_code ? String(created.coupon_code) : (o.couponCode ?? couponCode ?? null),
        couponDiscount: created.coupon_discount != null ? Number(created.coupon_discount) : couponDiscount,
        date: created.placed_at ? new Date(String(created.placed_at)).toLocaleString() : new Date().toLocaleString(),
        status: String(created.status ?? 'Placed'),
        paymentStatus: created.payment_status ? String(created.payment_status) : 'paid',
        placedAt: created.placed_at ? String(created.placed_at) : null,
        paidAt: created.paid_at ? String(created.paid_at) : null,
        courier: created.courier ? String(created.courier) : null,
        trackingNumber: created.tracking_number ? String(created.tracking_number) : null,
        trackingUrl: created.tracking_url ? String(created.tracking_url) : null,
        shippedAt: created.shipped_at ? String(created.shipped_at) : null,
        deliveredAt: created.delivered_at ? String(created.delivered_at) : null,
        cancelledAt: created.cancelled_at ? String(created.cancelled_at) : null,
        refundedAt: created.refunded_at ? String(created.refunded_at) : null,
        adminNote: created.admin_note ? String(created.admin_note) : null,
      } : { ...o, id: `ORD${Date.now().toString().slice(-6)}`, date: new Date().toLocaleString(), status: 'Placed', paymentStatus: 'paid' }
      setOrders((prev) => [order, ...prev.filter((x) => x.id !== order.id)])
      setCouponCode(null)
      setCouponDiscount(0)
      try { localStorage.removeItem('mp-coupon') } catch {}
      setCart([])
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
export function cartShipping(mode: string, lines: { p: Product; qty: number }[]) {
  const subTotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
  if (mode === 'pickup') {
    const hasExplicit = lines.some((l) => l.p.deliveryCharge != null)
    if (hasExplicit) return lines.reduce((s, l) => s + (l.p.deliveryCharge ?? 0) * l.qty, 0)
    return 0
  }
  const hasExplicit = lines.some((l) => l.p.deliveryCharge != null)
  if (hasExplicit) return lines.reduce((s, l) => s + (l.p.deliveryCharge ?? 0) * l.qty, 0)
  return subTotal >= 999 ? 0 : 49
}
export function cartGst(mode: string, lines: { p: Product; qty: number }[]) {
  const subTotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
  const shipping = cartShipping(mode, lines)
  return Math.round((subTotal + shipping) * 0.18 * 100) / 100
}
export function cartTotal(mode: string, lines: { p: Product; qty: number }[]) {
  const subTotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
  const shipping = cartShipping(mode, lines)
  const gst = Math.round((subTotal + shipping) * 0.18 * 100) / 100
  return subTotal + shipping + gst
}
export { errMsg }



