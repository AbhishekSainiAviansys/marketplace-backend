/** Trust strip: one quiet divider row. Items come from admin Home content. */
import { useHomeConfig } from '../../store/homeConfig'
import { Reveal } from './Reveal'

export function TrustStrip() {
  const cfg = useHomeConfig()
  const items = cfg.trust.length > 0 ? cfg.trust : []
  if (items.length === 0) return null
  return (
    <Reveal>
      <dl className="grid grid-cols-2 gap-y-4 rounded-2xl border-y border-[var(--border)] py-5 lg:grid-cols-4">
        {items.map((t, i) => (
          <div key={t.title} className={`px-5 ${i > 0 ? 'lg:border-l lg:border-[var(--border)]' : ''}`}>
            <dt className="text-sm font-bold text-[var(--text)]">{t.title}</dt>
            <dd className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">{t.sub}</dd>
          </div>
        ))}
      </dl>
    </Reveal>
  )
}
