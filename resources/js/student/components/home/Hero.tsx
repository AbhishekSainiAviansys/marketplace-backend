/** Editorial hero: calm split, one photo, admin copy. No video, no floats. */
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { HERO_POSTER } from '../../data/home'
import { useShop } from '../../store/shop'
import { useHomeConfig } from '../../store/homeConfig'
import { Reveal } from './Reveal'

export function Hero({ onShopClass }: { onShopClass: () => void }) {
  const { student } = useShop()
  const cfg = useHomeConfig()
  const firstName = student?.name?.split(' ')[0]

  return (
    <Reveal>
      <section className="st-paper-band overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:p-12">
          <div className="max-w-lg">
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-[var(--text-subtle)] uppercase">
              {student ? `Welcome back, ${firstName} · Class ${student.className}` : (cfg.hero.badge ?? 'Admissions week · up to 30% off bundles')}
            </p>
            <h1 className="st-display mt-3 text-3xl leading-[1.1] font-bold text-[var(--text)] sm:text-5xl">
              {student ? (
                <>Your Class {student.className} list, <em className="accent-text not-italic underline decoration-[var(--brand)]/30 decoration-2 underline-offset-4">sorted in one tap.</em></>
              ) : (
                <>{cfg.hero.headline ?? 'The school shop that feels like homework, '}<em className="accent-text not-italic underline decoration-[var(--brand)]/30 decoration-2 underline-offset-4">{cfg.hero.highlight ?? 'minus the homework.'}</em></>
              )}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
              {cfg.hero.sub ?? 'Books, bundles and bottles linked to your school — pay online or COD, collect at school or home.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <button onClick={onShopClass} className="btn btn-primary !px-5 !py-3 text-sm">
                Shop my class list <ArrowRight className="h-4 w-4" />
              </button>
              {!student && (
                <Link to="/register" className="btn btn-secondary !px-5 !py-3 text-sm">
                  Register as student
                </Link>
              )}
            </div>
            <p className="mt-5 text-xs text-[var(--text-subtle)]">
              Cash on Delivery at pickup · Free school pickup · Easy 7-day returns
            </p>
          </div>

          <figure className="relative">
            <img src={HERO_POSTER} alt="Students picking up school boxes at the school office"
              loading="eager" className="aspect-[4/3] w-full rounded-2xl object-cover shadow-[var(--shadow-raised)]" />
            <figcaption className="card absolute -bottom-5 left-5 max-w-3xs p-3.5 shadow-[var(--shadow-raised)]">
              <p className="text-xs leading-relaxed font-semibold text-[var(--text)]">“Ordered Monday, picked up Wednesday. Zero delivery fee.”</p>
              <p className="mt-1 text-[11px] text-[var(--text-subtle)]">Priya N. · Parent, Class 3</p>
            </figcaption>
          </figure>
        </div>
      </section>
    </Reveal>
  )
}

