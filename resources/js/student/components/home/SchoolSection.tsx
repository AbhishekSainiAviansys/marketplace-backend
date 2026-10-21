/** Register-as-school / coaching-institute CTA band: admin-managed copy, links to /school/onboarding.
 *  Right side shows two separate login tables — one for schools/educational institutes and one for
 *  private coaching institutes / educational instructors.
 *  Self-hides when the section is toggled off in Admin → Home content. */
import { ArrowRight, BadgeIndianRupee, Handshake, School, Users } from 'lucide-react'
import { useHomeConfig } from '../../store/homeConfig'
import { Reveal } from './Reveal'

const POINT_ICONS = [BadgeIndianRupee, Handshake, Users]

export function SchoolSection() {
  const cfg = useHomeConfig()
  if (!cfg.sections.school) return null
  const s = cfg.school
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
              <a href="/school/register" className="btn btn-primary">
                {s.cta || 'Register your school or institute'} <ArrowRight className="h-4 w-4" />
              </a>
              <span className="text-xs text-[var(--text-subtle)]">
                Takes about 3 minutes · reviewed before access
              </span>
            </div>

            {/* Separate login tables — schools/educational institutes vs private coaching institutes */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <School className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-bold text-[var(--text)]">School / Educational institute</span>
                </div>
                <p className="text-[11px] text-[var(--text-subtle)] mb-4">
                  Link your school panel, add products and manage catalogue.
                </p>
                <a
                  href="/school/login"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-3)]"
                >
                  School login <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span className="text-sm font-bold text-[var(--text)]">
                    Private coaching institute / instructor
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-subtle)] mb-4">
                  Run tuitions or coaching classes — register your institute panel.
                </p>
                <a
                  href="/coaching/register"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-3)]"
                >
                  Register coaching institute <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href="/coaching/login"
                  className="mt-2 block text-center text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  Already registered? Sign in
                </a>
              </div>
            </div>
          </div>

          {/* Visual side: accent panel with a big glyph (no stock photo needed). */}
          <div className="accent-bg relative hidden items-center justify-center p-8 md:flex" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_55%)]" />
            <div className="relative flex h-40 w-40 flex-col items-center justify-center rounded-full bg-white/90 text-center shadow-[var(--shadow-raised)]">
              <School className="h-10 w-10 accent-text" />
              <span className="mt-1 px-4 text-xs font-extrabold tracking-wide text-slate-700 uppercase">
                School panel
              </span>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  )
}