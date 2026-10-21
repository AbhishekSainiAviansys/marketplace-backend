/** Rotating full-width gallery banners (mitticool-style slider).
 * Auto-advances, pauses on hover/focus, honours prefers-reduced-motion. */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useHomeConfig } from '../../store/homeConfig'
import { Reveal } from './Reveal'

export function BannerSlider() {
  const cfg = useHomeConfig()
  const slides = cfg.sections.banners ? cfg.banners : []
  const n = slides.length
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const go = (d: number) => setI((v) => (v + d + n) % n)

  useEffect(() => {
    if (paused) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = setInterval(() => setI((v) => (v + 1) % n), 5500)
    return () => clearInterval(id)
  }, [paused, n])

  if (n === 0) return null

  return (
    <Reveal>
      <section
        aria-label="Featured offers"
        className="relative overflow-hidden rounded-3xl bg-slate-950 shadow-[var(--shadow-raised)] ring-1 ring-black/5"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        ref={ref}
      >
        <div className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translateX(-${i * 100}%)` }}>
          {slides.map((b) => (
            <div key={b.title} className="relative h-56 w-full shrink-0 sm:h-64 lg:h-72">
              <img src={b.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <div className={`absolute inset-0 bg-gradient-to-r ${b.tint ?? 'from-slate-950/90 via-slate-950/60 to-transparent'}`} />
              <div className="relative flex h-full max-w-2xl flex-col justify-center gap-2 p-6 text-white sm:p-10">
                <span className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-[0.16em] text-white/70 uppercase">{b.eyebrow}</span>
                  {b.chip && <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-extrabold text-slate-950">{b.chip}</span>}
                </span>
                <h2 className="st-display text-2xl leading-tight font-bold sm:text-4xl">
                  {b.title} <em className="text-amber-300 not-italic">{b.highlight}</em>
                </h2>
                <p className="max-w-md text-xs text-white/85 sm:text-sm">{b.sub}</p>
                <Link to={b.to} className="mt-1 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-amber-300">
                  {b.cta} →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* arrows */}
        <button onClick={() => go(-1)} aria-label="Previous banner"
          className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={() => go(1)} aria-label="Next banner"
          className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60">
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* dots */}
        <div className="absolute right-0 bottom-3 left-0 flex justify-center gap-1.5">
          {slides.map((b, d) => (
            <button key={b.title} onClick={() => setI(d)} aria-label={`Go to banner ${d + 1}`}
              className={`h-1.5 rounded-full transition-all ${d === i ? 'w-6 bg-amber-400' : 'w-3 bg-white/40 hover:bg-white/70'}`} />
          ))}
        </div>
      </section>
    </Reveal>
  )
}
