
/** Student session + cart/wishlist/orders — all localStorage in v1.
 * Backend student auth + order APIs land in Phase-2; the UI shape stays.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, errMsg, metaOf, rowsOf } from '@lib/api'

import { loadRazorpayScript, type RazorpayPaymentResponse } from '../lib/razorpay'
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

export type CartLine = { id: string; qty: number; color?: string | null; size?: string | null }
export type Order = {
  id: string; items: { id: string; name: string; price: number; qty: number; image: string; color?: string | null; size?: string | null; courier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; shippedAt?: string | null; deliveredAt?: string | null }[]
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
const PAGE_SIZE = 12

export type ShopCtx = {
  products: Product[]; live: boolean; loading: boolean
  loadingMore: boolean; hasMore: boolean; fetchMore: (params?: { category?: string; sub?: string; search?: string }) => void
  mergeRows: (rows: Product[]) => void
  refreshProducts: (ids: string[]) => Promise<Product[]>
  student: Student | null; login: (s: Student) => void; logout: () => void
  cart: CartLine[]; add: (id: string, qty?: number, color?: string | null, size?: string | null, freshProduct?: Product) => void; setQty: (id: string, qty: number, color?: string | null, size?: string | null) => void
  remove: (id: string, color?: string | null, size?: string | null) => void; clearCart: () => void
  wish: string[]; toggleWish: (id: string) => void
  cartDetailed: { p: Product; qty: number; color?: string | null; size?: string | null }[]; subTotal: number; mrpTotal: number; count: number, payable: number
  orders: Order[]; placeOrder: (o: Omit<Order, 'id' | 'date' | 'status'>) => Promise<Order>
  couponCode: string | null; couponDiscount: number; applyCoupon: (code: string, subtotal: number) => Promise<{ code: string; discount_amount: number }>; clearCoupon: () => void
}

const Ctx = createContext<ShopCtx | null>(null)

export const toProduct = (r: Record<string, unknown>, i: number): Product => {
  const cat = r.category as { name?: string } | undefined
  const sub = r.subCategory as { name?: string } | undefined
  const images = r.images as { url?: string; path?: string }[] | undefined
  const vals = r.values as { value?: unknown; field?: { name?: string } }[] | undefined
  const price = Number(r.price ?? 0)
  const charges = Number(r.portal_charge ?? 0) + Number(r.server_charge ?? 0)
  const customerPrice = Math.round((price + charges + Number.EPSILON) * 100) / 100
  const imageUrls = (images ?? []).map((im) => im.url ?? im.path ?? '').filter(Boolean)
  const rawVariants = Array.isArray(r.variants) ? r.variants as Record<string, unknown>[] : []
  const rawStockRows = Array.isArray(r.stock_rows) ? r.stock_rows as Record<string, unknown>[] : Array.isArray(r.product_stocks) ? r.product_stocks as Record<string, unknown>[] : []
  const stockRows = rawStockRows.map((row) => ({
    id: Number(row.id ?? 0) || undefined,
    variant_id: row.variant_id == null ? null : Number(row.variant_id),
    colour: String(row.colour ?? row.color ?? ''),
    color_code: row.color_code == null ? null : String(row.color_code),
    size: String(row.size ?? ''),
    quantity: Number(row.quantity ?? row.stock ?? row.qty ?? 0),
    stock: Number(row.quantity ?? row.stock ?? row.qty ?? 0),
    qty: Number(row.quantity ?? row.stock ?? row.qty ?? 0),
  }))
  const variantRows = stockRows.length ? stockRows : rawVariants
  const variants = variantRows.map((v: Record<string, unknown>) => ({
    id: (v.id ?? v.variant_id) as string | number | undefined,
    color: (v.color ?? v.colour ?? null) as string | null,
    color_code: (v.color_code ?? null) as string | null,
    size: v.size as string | null,
    stock: v.stock == null ? null : Number(v.stock ?? v.quantity ?? 0),
    price: v.price == null ? null : Math.round((Number(v.price) + charges + Number.EPSILON) * 100) / 100,
    sku: v.sku == null ? null : String(v.sku),
  }))
  const specs = vals && vals.length
    ? vals.map((v) => ({ label: String((v as any).field_name ?? (v.field as any)?.field_label ?? (v.field as any)?.field_name ?? v.field?.name ?? 'Spec'), value: String(v.value ?? '') }))
    : [{ label: 'Category', value: cat?.name ?? 'Book' }]
  if (!specs.some((s) => s.label === 'Category')) specs.unshift({ label: 'Category', value: cat?.name ?? 'Book' })
  return {
    id: String(r.product_code ?? r.id ?? `live-${i}`),
    dbId: Number.isFinite(Number(r.id)) ? Number(r.id) : undefined,
    sku: r.sku == null ? null : String(r.sku),
    brand: r.brand == null ? null : String(r.brand),
    name: String(r.name ?? 'Product'),
    category: cat?.name ?? 'Book',
    subCategory: sub?.name ?? null,
    price: customerPrice, mrp: Number(r.mrp ?? price),
    rating: Number(r.rating ?? 4.5), reviews: Number(r.reviews_count ?? (50 + ((i * 37) % 300))), stock: Number(r.stock ?? 10), stock_rows: stockRows, is_variant: r.is_variant == null ? variantRows.length > 0 : Boolean(r.is_variant), image: imageUrls[0] ?? 'https://images.unsplash.com/photo-1449824900964-72a3873ebcb9?auto=format&fit=crop&w=800&q=80',
    images: imageUrls.length ? imageUrls : undefined,
    delivery: (r.delivery_mode as Product['delivery']) ?? 'school_pickup',
    deliveryCharge: r.delivery_charge == null ? null : Number(r.delivery_charge),
    schoolCode: 'SCH001', classTag: 'All',
    blurb: String(r.description ?? r.name ?? 'Product'),
    specs,
    variants,
  }
}

export async function fetchBoosted(ids: (string | number)[]): Promise<Product[]> {
  if (ids.length === 0) return []
  const r = await api.get('/products', { params: { ids: ids.join(',') } })
  const rows = rowsOf<Record<string, unknown>>(r.data)
  return rows.map(toProduct)
}

export async function fetchRandom(n: number): Promise<Product[]> {
  // Return cached results if available and count matches
  if (cachedRandomProducts !== null && cachedRandomCount === n) {
    return cachedRandomProducts
  }
  const r = await api.get('/products', { params: { random: 1, per_page: Math.max(1, n) } })
  const rows = rowsOf<Record<string, unknown>>(r.data)
  const products = rows.map(toProduct)
  // Cache the result
  cachedRandomProducts = products
  cachedRandomCount = n
  return products
}

// Cache for random products to avoid repeated API calls
let cachedRandomProducts: Product[] | null = null
let cachedRandomCount: number | null = null

const productRequests = new Map<string, Promise<Product>>()

export async function fetchProduct(id: string | number): Promise<Product> {
  const key = String(id)
  const pending = productRequests.get(key)
  if (pending) return pending
  const request = api.get(`/products/${encodeURIComponent(key)}`)
    .then((r) => toProduct(r.data as Record<string, unknown>, 0))
  productRequests.set(key, request)
  void request.finally(() => {
    if (productRequests.get(key) === request) productRequests.delete(key)
  }).catch(() => {})
  return request
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
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

  const fetchMore = async (params?: { category?: string; sub?: string; search?: string }) => {
    if (!liveRef.current || loadingMore || page >= lastPage) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const r = await api.get('/products', { params: { per_page: PAGE_SIZE, page: next, category: params?.category, sub_category: params?.sub, search: params?.search } })
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

  const mergeRows = (rows: Product[]) => {
    if (rows.length === 0) return
    setProducts((prev) => {
      const incoming = new Map(rows.map((product) => [product.id, product]))
      const merged = prev.map((product) => {
        const fresh = incoming.get(product.id)
        if (fresh) incoming.delete(product.id)
        return fresh ?? product
      })
      return incoming.size > 0 ? [...merged, ...incoming.values()] : merged
    })
  }

  const refreshProducts = async (ids: string[]) => {
    const rows = await Promise.all([...new Set(ids)].map(fetchProduct))
    mergeRows(rows)
    return rows
  }


  useEffect(() => { localStorage.setItem(C_KEY, JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem(W_KEY, JSON.stringify(wish)) }, [wish])
  useEffect(() => { localStorage.setItem(O_KEY, JSON.stringify(orders)) }, [orders])

  const isAuthed = () => !!localStorage.getItem('token')

  const loadCartFromBackend = async () => {
    if (!isAuthed()) return
    try {
      const r = await api.get('/student/cart')
      const rows = rowsOf<{ product_code?: string | number; product_id?: string | number; qty: number; color?: string | null; size?: string | null }>(r.data)
      setCart(rows.map((x) => ({ id: String(x.product_code ?? x.product_id), qty: Number(x.qty), color: x.color ?? null, size: x.size ?? null })))
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
          id: String(it.product_code ?? it.id ?? it.product_id ?? i),
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
  }, [live, wish, cart, byId])

  const cartDetailed = useMemo(
    () => cart.flatMap((l) => { const p = byId.get(l.id); return p ? [{ p, qty: l.qty, color: l.color, size: l.size }] : [] }),
    [cart, byId],
  )
  const subTotal = cartDetailed.reduce((s, l) => s + l.p.price * l.qty, 0)
  const mrpTotal = cartDetailed.reduce((s, l) => s + l.p.mrp * l.qty, 0)
  const count = cart.reduce((s, l) => s + l.qty, 0)

  const v: ShopCtx = {
    products, live, loading,
    loadingMore, hasMore: live && page < lastPage, fetchMore, mergeRows, refreshProducts,
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
            await api.post('/student/cart/items', { product_code: l.id, qty: l.qty, color: l.color, size: l.size }).catch(() => {})
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
    add: (id: string, qty = 1, color?: string | null, size?: string | null, freshProduct?: Product) => {
      if (!isAuthed()) {
        setCart((c) => {
          const p = freshProduct ?? byId.get(id)
          let cap = p ? Math.max(0, p.stock) : 9
          const hasVariants = p?.is_variant ?? (p?.variants ?? []).length > 0
          if (hasVariants) {
            const v = (p?.variants ?? []).find((x) => x.color === color && x.size === size)
            cap = Number(v?.stock ?? 0)
          }
          cap = Math.min(9, cap)
          if (cap <= 0) return c
          const key = (l: CartLine) => l.id === id && l.color === color && l.size === size
          const f = c.find(key)
          if (f) return c.map((l) => (key(l) ? { ...l, qty: Math.min(cap, l.qty + qty) } : l))
          return [...c, { id, qty: Math.min(qty, cap), color: color ?? null, size: size ?? null }]
        })
        return
      }
      void (async () => {
        try { await api.post('/student/cart/items', { product_code: id, qty, color, size }) } catch {}
        await loadCartFromBackend()
      })()
    },

    setQty: (id: string, qty: number, color?: string | null, size?: string | null) => {
      if (!isAuthed()) {
        setCart((c) => {
          const p = byId.get(id)
          let cap = p ? Math.max(0, p.stock) : 9
          const hasVariants = p?.is_variant ?? (p?.variants ?? []).length > 0
          if (hasVariants) {
            const v = (p?.variants ?? []).find((x) => x.color === color && x.size === size)
            cap = Number(v?.stock ?? 0)
          }
          cap = Math.min(9, cap)
          const key = (l: CartLine) => l.id === id && l.color === color && l.size === size
          if (qty <= 0 || cap <= 0) return c.filter((l) => !key(l))
          return c.map((l) => (key(l) ? { ...l, qty: Math.min(cap, qty) } : l))
        })
        return
      }
      void (async () => {
        try {
          if (qty <= 0) await api.delete(`/student/cart/items/${encodeURIComponent(id)}`, { params: { color, size } })
          else await api.patch(`/student/cart/items/${id}`, { qty, color, size })
        } catch {}
        await loadCartFromBackend()
      })()
    },
    remove: (id: string, color?: string | null, size?: string | null) => {
      if (!isAuthed()) {
        setCart((c) => c.filter((l) => !(l.id === id && l.color === color && l.size === size)))
        return
      }
      void (async () => {
        try { await api.delete(`/student/cart/items/${encodeURIComponent(id)}`, { params: { color, size } }) } catch {}
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
    payable: subTotal,
    orders,
    couponCode,
    couponDiscount,

    applyCoupon: async (code, subtotal) => {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Login required')
      const res = await api.post('/student/coupons/validate', { code, subtotal, total_payable: subtotal })
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
      const totalPayable = Number(o.total);
      if (!Number.isFinite(totalPayable) || totalPayable <= 0) {
        throw new Error('Invalid payable amount.');
      }
      const createRes = await api.post('/student/payments/razorpay/order', {
          items: o.items.map((item) => ({
            product_code: item.id,
            qty: item.qty,
            color: item.color,
            size: item.size,
          })),
          delivery: o.delivery,
          address: o.address,
          coupon_code: o.couponCode ?? couponCode ?? undefined,
          coupon_discount: o.couponDiscount ?? couponDiscount ?? 0,
          pay_mode: o.payMode,
          subtotal: Number(subTotal.toFixed(2)),
          mrp_total: Number(mrpTotal.toFixed(2)),
          total_payable: Number(totalPayable.toFixed(2)),
      });
      const { key_id, razorpay_order_id, amount, currency } = createRes.data as {
          key_id: string
          razorpay_order_id: string
          amount: number
          currency: string
        }
      let created: Record<string, unknown> | null = null
      const cancelReservation = async () => {
        await api.post('/student/payments/razorpay/cancel', { razorpay_order_id }).catch(() => {})
      }
      let gatewayPaymentSucceeded = false
      try {
        await loadRazorpayScript()
        const RazorpayCtor = window.Razorpay
        if (!RazorpayCtor) throw new Error('Razorpay checkout failed to load.')


        const payment = await new Promise<RazorpayPaymentResponse>((resolve, reject) => {
          let settled = false
          const rzp = new RazorpayCtor({
            key: key_id,
            amount,
            currency,
            order_id: razorpay_order_id,
            name: 'Marketplace',
            description: 'Test payment',
            prefill: {
              name: student?.name,
              contact: student?.whatsapp,
              email: student?.email,
            },
            theme: { color: '#2563eb' },
            handler: (resp: any) => {
              if (settled) return
              settled = true
              gatewayPaymentSucceeded = true
              resolve({
                razorpay_order_id: String(resp?.razorpay_order_id ?? razorpay_order_id),
                razorpay_payment_id: String(resp?.razorpay_payment_id ?? ''),
                razorpay_signature: String(resp?.razorpay_signature ?? ''),
              })
            },
            modal: {
              ondismiss: () => {
                if (settled) return
                settled = true
                void cancelReservation()
                reject(new Error('Payment cancelled'))
              },
            },
          })
          try { rzp.on('payment.failed', (resp: any) => {
            if (settled) return
            settled = true
            rzp.close()
            void cancelReservation()
            reject(new Error(resp?.error?.description || 'Payment failed'))
          }) } catch {}
          rzp.open()
        })
        const verifyRes = await api.post('/student/payments/razorpay/verify', {
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: payment.razorpay_signature,
        })
        created = (verifyRes.data ?? null) as Record<string, unknown> | null
      } catch (error) {
        if (!gatewayPaymentSucceeded) await cancelReservation()
        throw error
      }
      if (!created) throw new Error('Payment completed, but the order could not be confirmed. Contact support before retrying.')
      try { await api.delete('/student/cart') } catch {}
      await loadCartFromBackend()
      const order: Order = {
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
      }
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


