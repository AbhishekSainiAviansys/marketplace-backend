/** Student discovery CTA band -> /directory (country / state / district +
 *  type filters). Self-hides when the section is toggled off in
 *  Admin -> Home content. */
import { ArrowRight, GraduationCap, MapPin, School, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useHomeConfig } from '../../store/homeConfig'
import { Reveal } from './Reveal'

const POINT_ICONS = [MapPin, School, GraduationCap]

const TYPE_CARDS = [
  { to: '/directory?type=school', icon: School, title: 'School', sub: 'Board schools with pickup counters' },
  { to: '/directory?type=private_coaching', icon: Users, title: 'Private coaching', sub: 'Tuition and coaching centres' },
  { to: '/directory?type=private_institute', icon: GraduationCap, title: 'Private institute', sub: 'Tutor institutes and academies' },
]

export function DirectorySection() {
  const cfg = useHomeConfig()
  if (!cfg.sections.directory) return null
  const s = cfg.directory
  if (!s.title && !s.sub) return null

  return (
    <Reveal>
      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="grid gap-0 md:grid-cols-2">
          {/* Copy side */}
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-[var(--text-subtle)] uppercase">
              {s.kicker}
            </p>
            <h2 className="st-display mt-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
              {s.title}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--text-muted)]">{s.sub}</p>

            {s.points.length > 0 && (
              <ul className="mt-5 space-y-2.5">
                {s.points.filter((p) => p.trim()).map((p, i) => {
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
              <Link to="/directory" className="btn btn-primary">
                {s.cta || 'Browse the directory'} <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-xs text-[var(--text-subtle)]">
                Free for students - registration and basic details on every listing
              </span>
            </div>

            {/* Jump straight into a filtered view */}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {TYPE_CARDS.map((card) => (
                <Link
                  key={card.to}
                  to={card.to}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 transition hover:bg-[var(--surface-3)]"
                >
                  <span className="accent-soft accent-soft-text flex h-8 w-8 items-center justify-center rounded-full">
                    <card.icon className="h-4 w-4" />
                  </span>
                  <span className="mt-3 block text-sm font-bold text-[var(--text)]">{card.title}</span>
                  <span className="mt-1 block text-[11px] leading-snug text-[var(--text-subtle)]">{card.sub}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Visual side: accent panel with a big glyph (mirrors SchoolSection). */}
          <div className="accent-bg relative hidden items-center justify-center p-8 md:flex" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_55%)]" />
            <div className="relative flex h-40 w-40 flex-col items-center justify-center rounded-full bg-white/90 text-center shadow-[var(--shadow-raised)]">
              <MapPin className="h-10 w-10 accent-text" />
              <span className="mt-1 px-4 text-xs font-extrabold tracking-wide text-slate-700 uppercase">
                Find nearby
              </span>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  )
}