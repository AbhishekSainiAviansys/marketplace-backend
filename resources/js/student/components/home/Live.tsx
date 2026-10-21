/** Pickup story + steps + parent quotes. All copy from admin Home content. */
import { Link } from 'react-router-dom'
import { CalendarClock, PackageCheck, Play, Quote } from 'lucide-react'
import { LIVE_POSTER } from '../../data/home'
import { useHomeConfig } from '../../store/homeConfig'
import { Reveal } from './Reveal'

export function LiveSection() {
  const cfg = useHomeConfig()
  const live = cfg.live

  return (
    <div className="grid items-start gap-8 lg:grid-cols-2">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl text-white shadow-[var(--shadow-card)]">
          <img src={LIVE_POSTER} alt="Classroom ready for school pickup day" loading="lazy" className="h-72 w-full object-cover sm:h-96" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
          <span className="absolute top-4 left-4 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-[0.14em] uppercase backdrop-blur">
            {live.kicker}
          </span>
          <button aria-label="Play pickup walkthrough"
            className="absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/40 backdrop-blur transition hover:scale-105 hover:bg-white/25">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-950">
              <Play className="h-5 w-5 fill-slate-950" />
            </span>
          </button>
          <div className="absolute right-4 bottom-4 left-4 sm:right-6 sm:bottom-6 sm:left-6">
            <h3 className="st-display text-2xl leading-tight font-bold sm:text-3xl">{live.title}</h3>
            <p className="mt-1 text-xs text-white/75 sm:text-sm">{live.sub}</p>
            <div className="mt-3 hidden gap-2 sm:flex">
              {live.schedule.slice(0, 2).map((s) => (
                <div key={s.title} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs backdrop-blur">
                  <CalendarClock className="h-4 w-4 shrink-0 text-amber-300" />
                  <b>{s.time}</b><span className="truncate text-white/80">· {s.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <div className="py-1 sm:py-2">
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-[var(--text-subtle)] uppercase">How it works</p>
          <h3 className="st-display mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
            <PackageCheck className="h-6 w-6 accent-text" /> Pickup in 3 tiny steps
          </h3>
          <ol className="mt-6 space-y-6">
            {live.steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="st-display text-3xl font-bold accent-text">{String(i + 1).padStart(2, '0')}</span>
                <span><b className="block text-sm text-[var(--text)] sm:text-base">{s.title}</b><span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-muted)] sm:text-sm">{s.sub}</span></span>
              </li>
            ))}
          </ol>
          <Link to="/track" className="btn btn-secondary mt-7 !px-5 !py-2.5 text-sm">Track a pickup →</Link>
        </div>
      </Reveal>
    </div>
  )
}

export function Quotes() {
  const cfg = useHomeConfig()
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cfg.quotes.map((t, i) => (
        <Reveal key={t.name} delay={i * 90}>
          <figure className="card h-full p-5 sm:p-6">
            <Quote className="h-5 w-5 accent-text" />
            <blockquote className="mt-2 text-sm leading-relaxed text-[var(--text)]">“{t.quote}”</blockquote>
            <figcaption className="mt-3 text-xs"><b className="text-[var(--text)]">{t.name}</b> <span className="text-[var(--text-subtle)]">· {t.role}</span></figcaption>
          </figure>
        </Reveal>
      ))}
    </div>
  )
}
