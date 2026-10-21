/** Ad ticker + promo banner grid (one with live countdown). */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, Timer } from 'lucide-react'
import { useHomeConfig } from '../../store/homeConfig'
import { Reveal } from './Reveal'

export function Ticker() {
  const cfg = useHomeConfig()
  const base = cfg.sections.ticker ? cfg.ticker : []
  if (base.length === 0) return null
  const items = [...base, ...base]
  return (
    <div className="accent-bg relative overflow-hidden rounded-2xl py-2.5 text-white shadow-[var(--shadow-card)]" role="marquee" aria-label="Current offers">
      <div className="st-marquee items-center gap-8 pr-8">
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-2 text-xs font-bold tracking-wide whitespace-nowrap uppercase">
            <Megaphone className="h-3.5 w-3.5 opacity-80" /> {t} <span className="ml-6 opacity-40">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function useCountdown() {
  const [left, setLeft] = useState('')
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const end = new Date(now)
      end.setDate(now.getDate() + ((7 - now.getDay()) % 7))
      end.setHours(23, 59, 59, 0)
      const s = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000))
      const d = Math.floor(s / 86400)
      const h = Math.floor((s % 86400) / 3600)
      const m = Math.floor((s % 3600) / 60)
      setLeft(`${d}d : ${h}h : ${m}m`)
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])
  return left
}

function PromoLink({ to, className, children }: { to: string; className: string; children: ReactNode }) {
  if (to.startsWith('/school/') || to.startsWith('/coaching/')) {
    return <a href={to} className={className}>{children}</a>
  }
  return <Link to={to} className={className}>{children}</Link>
}

export function PromoGrid() {
  const cfg = useHomeConfig()
  const left = useCountdown()
  const promos = cfg.promos
  if (promos.length === 0) return null
  const [first, ...rest] = promos
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Reveal>
        <PromoLink to={first.to}
          className="group relative flex min-h-72 flex-col justify-end overflow-hidden rounded-2xl p-6 text-white shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-raised)] md:min-h-full">
          <img src={first.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className={`absolute inset-0 bg-gradient-to-t ${first.tint}`} />
          <div className="relative">
            <span className="text-[11px] font-bold tracking-[0.16em] text-white/70 uppercase">{first.tag}</span>
            <h3 className="st-display mt-1 text-2xl leading-tight font-bold sm:text-3xl">{first.title}</h3>
            <p className="mt-1 max-w-sm text-xs text-white/80 sm:text-sm">{first.sub}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold">
              <span className="rounded-lg bg-white px-3.5 py-2 text-slate-900 transition group-hover:bg-amber-300">{first.cta} →</span>
              {first.countdown && <span className="flex items-center gap-1 rounded-lg bg-black/45 px-2 py-1 backdrop-blur"><Timer className="h-3.5 w-3.5" /> {left}</span>}
            </span>
          </div>
        </PromoLink>
      </Reveal>
      <div className="grid gap-4">
        {rest.map((p, i) => (
          <Reveal key={p.title} delay={(i + 1) * 90}>
            <PromoLink to={p.to}
              className="group relative flex min-h-44 flex-col justify-end overflow-hidden rounded-2xl p-5 text-white shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-raised)]">
              <img src={p.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className={`absolute inset-0 bg-gradient-to-t ${p.tint}`} />
              <div className="relative">
                <span className="text-[11px] font-bold tracking-[0.16em] text-white/70 uppercase">{p.tag}</span>
                <h3 className="mt-1 text-lg leading-tight font-extrabold">{p.title}</h3>
                <p className="mt-0.5 text-xs text-white/80">{p.sub}</p>
                <span className="mt-2.5 inline-flex items-center gap-2 text-xs font-extrabold">
                  <span className="rounded-lg bg-white px-3 py-1.5 text-slate-900 transition group-hover:bg-amber-300">{p.cta} →</span>
                  {p.countdown && <span className="flex items-center gap-1 rounded-lg bg-black/45 px-2 py-1 backdrop-blur"><Timer className="h-3.5 w-3.5" /> {left}</span>}
                </span>
              </div>
            </PromoLink>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
