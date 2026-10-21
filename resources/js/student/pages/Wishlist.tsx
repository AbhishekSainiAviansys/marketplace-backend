/** Wishlist grid with move-to-cart. */
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart } from 'lucide-react'
import { EmptyState } from '@ui'
import { rupee, useShop } from '../store/shop'

export function Wishlist() {
  const { products, wish, toggleWish, add } = useShop()
  const rows = products.filter((p) => wish.includes(p.id))
  if (rows.length === 0) {
    return <div className="card"><EmptyState title="No favourites yet"
      hint="Tap the heart on any product to save it here."
      action={<Link to="/" className="btn btn-primary"><Heart className="h-4 w-4" /> Discover products</Link>} /></div>
  }
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-[var(--text)]">Wishlist ({rows.length})</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((p) => (
          <article key={p.id} className="card card-hover overflow-hidden">
            <Link to={`/product/${p.id}`}><img src={p.image} alt={p.name} className="aspect-[4/3] w-full object-cover" /></Link>
            <div className="p-4">
              <Link to={`/product/${p.id}`} className="line-clamp-2 text-sm font-bold text-[var(--text)] hover:underline">{p.name}</Link>
              <p className="tnum mt-1 text-lg font-bold text-[var(--text)]">{rupee(p.price)}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => { add(p.id); toggleWish(p.id) }} className="btn btn-primary flex-1 !py-2 text-xs"><ShoppingCart className="h-4 w-4" /> Move to cart</button>
                <button onClick={() => toggleWish(p.id)} className="btn btn-secondary !px-3 !py-2 text-xs">Remove</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}



