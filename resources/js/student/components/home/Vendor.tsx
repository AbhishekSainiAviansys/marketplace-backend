/** Register-as-vendor CTA band: admin-managed copy, links to /sell.
 *  Self-hides when the section is toggled off in Admin → Home content. */
import { ArrowRight, BadgeIndianRupee, Handshake, PackageCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useHomeConfig } from '../../store/homeConfig'
import { Reveal } from './Reveal'

const POINT_ICONS = [BadgeIndianRupee, PackageCheck, Handshake]

export function VendorSection() {
  const cfg = useHomeConfig()
  if (!cfg.sections.vendor) return null
  const v = cfg.vendor
  if (!v.title && !v.sub) return null

  return (
    <Reveal>
      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="grid gap-0 md:grid-cols-2">
          {/* Copy side */}
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-[var(--text-subtle)] uppercase">
              {v.kicker}
            </p>
            <h2 className="st-display mt-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
              {v.title}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--text-muted)]">{v.sub}</p>

            {v.points.length > 0 && (
              <ul className="mt-5 space-y-2.5">
                {v.points.filter((p) => p.trim()).map((p, i) => {
                  const Icon = POINT_ICONS[i % POINT_ICONS.length]
                  return (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-[var(--text)]">
                      <span className="accent-soft accent-soft-text mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="leading-snug">{p}</span>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/sell" className="btn btn-primary">
                {v.cta || 'Become a seller'} <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-xs text-[var(--text-subtle)]">Takes about 3 minutes · no listing fee</span>
            </div>
          </div>

          {/* Visual side: accent panel with a big glyph (no stock photo needed). */}
          <div className="accent-bg relative hidden items-center justify-center p-8 md:flex" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_55%)]" />
            <div className="relative flex h-40 w-40 flex-col items-center justify-center rounded-full bg-white/90 text-center shadow-[var(--shadow-raised)]">
              <BadgeIndianRupee className="h-10 w-10 accent-text" />
              <span className="mt-1 px-4 text-xs font-extrabold tracking-wide text-slate-700 uppercase">
                Sell at school
              </span>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  )
}
