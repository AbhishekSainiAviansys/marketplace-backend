/** Policy + contact pages — all copy admin-managed (Admin → Pages & Footer). */
import { Link } from 'react-router-dom'
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { useSiteInfo, type PageKey } from '../store/siteInfo'

function Page({ pageKey }: { pageKey: PageKey }) {
  const { pages } = useSiteInfo()
  const p = pages[pageKey]
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <p className="text-[11px] font-extrabold tracking-[0.14em] text-[var(--text-subtle)] uppercase">Store policies</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[var(--text)] sm:text-3xl">{p.title}</h1>
      </div>
      <div className="card space-y-3 p-5 sm:p-6">
        {p.body.split('\n').filter((x) => x.trim()).map((para, i) => (
          <p key={i} className="text-sm leading-relaxed text-[var(--text-muted)]">{para}</p>
        ))}
      </div>
      <Link to="/shop" className="inline-block text-xs font-bold accent-text hover:underline">← Back to shop</Link>
    </div>
  )
}

export const Privacy = () => <Page pageKey="privacy" />
export const ReturnPolicy = () => <Page pageKey="return" />
export const RefundPolicy = () => <Page pageKey="refund" />
export const Terms = () => <Page pageKey="terms" />

export function Contact() {
  const { contact, socials } = useSiteInfo()
  const wa = socials.find((s) => s.network === 'WhatsApp')
  const rows = [
    contact.phone ? { icon: Phone, label: 'Phone', value: contact.phone, href: `tel:${contact.phone.replace(/\s/g, '')}` } : null,
    contact.email ? { icon: Mail, label: 'Email', value: contact.email, href: `mailto:${contact.email}` } : null,
    contact.address ? { icon: MapPin, label: 'Address', value: contact.address, href: null } : null,
    contact.hours ? { icon: Clock, label: 'Hours', value: contact.hours, href: null } : null,
  ].filter((x): x is NonNullable<typeof x> => !!x)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <p className="text-[11px] font-extrabold tracking-[0.14em] text-[var(--text-subtle)] uppercase">Get in touch</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[var(--text)] sm:text-3xl">Contact us</h1>
      </div>
      <div className="card space-y-2 p-5 sm:p-6">
        {rows.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">Contact details coming soon.</p>
        )}
        {rows.map(({ icon: Icon, label, value, href }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl px-2 py-2">
            <span className="accent-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-xl accent-soft-text">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold tracking-wide text-[var(--text-subtle)] uppercase">{label}</span>
              {href ? (
                <a href={href} className="block truncate text-sm font-bold text-[var(--text)] hover:underline">{value}</a>
              ) : (
                <span className="block text-sm font-bold text-[var(--text)]">{value}</span>
              )}
            </span>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-2">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="btn btn-primary !px-4 !py-2 text-xs">Email us</a>
          )}
          {wa && (
            <a href={wa.url} target="_blank" rel="noreferrer" className="btn btn-secondary !px-4 !py-2 text-xs">
              <MessageCircle className="h-4 w-4" /> WhatsApp us
            </a>
          )}
        </div>
      </div>
      <Link to="/shop" className="inline-block text-xs font-bold accent-text hover:underline">← Back to shop</Link>
    </div>
  )
}
