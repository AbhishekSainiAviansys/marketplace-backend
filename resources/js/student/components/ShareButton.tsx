/** Share affordance for a product card: social apps + copy-link. */
import { useEffect, useRef, useState } from 'react'
import { Copy, Check, Mail, Share2 } from 'lucide-react'
import { rupee } from '../store/shop'
import type { Product } from '../data/products'

const SOCIAL_PATHS: Record<string, string> = {
  Facebook: 'M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V11H8.5v3H11v7h2.5z',
  X: 'M17.8 4h2.7l-6 6.8L21.5 20h-5.6l-4.3-5.6L6.6 20H3.9l6.4-7.3L3.6 4H9.3l3.9 5.1L17.8 4zm-1 14.3h1.5L8.1 5.6H6.5l10.3 12.7z',
  LinkedIn: 'M6.9 8.6H4V20h2.9V8.6zM5.4 4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM9.5 8.6h2.7v1.6h.1c.4-.7 1.3-1.5 2.7-1.5 2.9 0 3.4 1.9 3.4 4.4V20h-2.9v-6.2c0-1.5 0-3.4-2.1-3.4s-2.4 1.6-2.4 3.3V20H9.5V8.6z',
  WhatsApp: 'M12 4a8 8 0 0 0-6.9 12L4 20l4.1-1.1A8 8 0 1 0 12 4zm0 14.6a6.6 6.6 0 0 1-3.4-.9l-.2-.1-2.4.6.6-2.3-.2-.2a6.6 6.6 0 1 1 5.6 2.9zm3.6-4.9c-.2-.1-1.2-.6-1.4-.6-.2-.1-.3-.1-.5.1l-.7.8c-.1.2-.3.2-.5.1a5.4 5.4 0 0 1-2.7-2.3c-.2-.4.2-.4.6-1.3.1-.2 0-.3 0-.4l-.6-1.5c-.2-.4-.3-.4-.5-.4h-.4c-.1 0-.4.1-.5.3-.2.2-.7.7-.7 1.7s.7 2 .8 2.1c.1.1 1.4 2.2 3.5 3 .5.2.9.3 1.2.4.5.2 1 .1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1 0-.1-.2-.1-.4-.2z',
}

function SocialIcon({ network, className }: { network: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d={SOCIAL_PATHS[network] ?? SOCIAL_PATHS.Facebook} />
    </svg>
  )
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export function ShareButton({ p }: { p: Product }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const url = `${window.location.origin}/product/${p.id}`
  const text = `${p.name} — ${rupee(p.price)}`
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(t)
  }, [copied])

  const stop = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const items = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, icon: <SocialIcon network="WhatsApp" className="h-4 w-4" /> },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, icon: <SocialIcon network="Facebook" className="h-4 w-4" /> },
    { label: 'X (Twitter)', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, icon: <SocialIcon network="X" className="h-4 w-4" /> },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, icon: <SocialIcon network="LinkedIn" className="h-4 w-4" /> },
    { label: 'Email', href: `mailto:?subject=${encodeURIComponent(p.name)}&body=${encodeURIComponent(`${text}\n${url}`)}`, icon: <Mail className="h-4 w-4" /> },
  ]

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={(e) => { stop(e); setOpen((v) => !v) }}
        aria-label="Share product"
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn btn-icon !p-2 btn-secondary"
      >
        <Share2 className="h-4 w-4" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
          {items.map((it) => (
            <a key={it.label} role="menuitem" href={it.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-3)]">
              {it.icon}
              <span>{it.label}</span>
            </a>
          ))}

          <button type="button" role="menuitem" onClick={async (e) => { stop(e); const ok = await copyText(url); if (ok) setCopied(true); setOpen(false) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-3)]">
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied link' : 'Copy link'}</span>
          </button>

          {canNativeShare && (
            <button type="button" role="menuitem" onClick={async (e) => { stop(e); try { await navigator.share({ title: p.name, text, url }) } catch { /* cancelled */ } setOpen(false) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-3)]">
              <Share2 className="h-4 w-4" />
              <span>More apps…</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
