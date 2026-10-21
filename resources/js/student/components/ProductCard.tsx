/** Shared product card reused by home / wishlist / details-related. */
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import { deliveryLabel, discount, rupee, useShop } from '../store/shop'
import type { Product } from '../data/products'

export function Stars({ v }: { v: number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <b className="text-[var(--text)]">{v.toFixed(1)}</b>
    </span>
  )
}

export function ProductCard({ p }: { p: Product }) {
  const { add, wish, toggleWish } = useShop()
  const off = discount(p)
  const loved = wish.includes(p.id)
  return (
    <article className="card card-hover group flex flex-col overflow-hidden">
      <Link to={`/product/${p.id}`} className="relative block aspect-[4/3] overflow-hidden">
        <img src={p.image} alt={p.name} loading="lazy"
          className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105"
          onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/' + p.id + '/800/600' }} />
        {off > 0 && <span className="absolute top-2 left-2 rounded-lg bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">{off}% OFF</span>}
        <span className="absolute top-2 right-2 rounded-lg bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">{p.category}</span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold tracking-wide text-[var(--text-subtle)] uppercase">{deliveryLabel[p.delivery]} · Class {p.classTag}</p>
        <Link to={`/product/${p.id}`} className="mt-1 line-clamp-2 text-sm font-bold text-[var(--text)] hover:underline">{p.name}</Link>
        <div className="mt-1.5 flex items-center justify-between">
          <Stars v={p.rating} />
          <span className="text-[11px] text-[var(--text-subtle)]">({p.reviews})</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="tnum text-lg font-bold text-[var(--text)]">{rupee(p.price)}</span>
          {p.mrp > p.price && <span className="tnum text-xs text-[var(--text-subtle)] line-through">{rupee(p.mrp)}</span>}
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => add(p.id)} className="btn btn-primary flex-1 !py-2 text-xs">
            <ShoppingCart className="h-4 w-4" /> Add to cart
          </button>
          <button onClick={() => toggleWish(p.id)} aria-label="Wishlist"
            className={`btn btn-icon !p-2 ${loved ? 'bg-rose-50 text-rose-500' : 'btn-secondary'}`}>
            <Heart className={`h-4 w-4 ${loved ? 'fill-rose-500' : ''}`} />
          </button>
        </div>
      </div>
    </article>
  )
}

export function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="card overflow-hidden">
          <div className="skeleton aspect-[4/3]" />
          <div className="space-y-2 p-4"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/3" /></div>
        </div>
      ))}
    </div>
  )
}


