/** Lazy loader for the Razorpay Checkout.js script. */
export type RazorpayPaymentResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (resp: unknown) => void) => void }
  }
}

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

export function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null
    if (existing) {
      if ((existing as any).__loaded) { resolve(); return }
      existing.addEventListener('load', () => { (existing as any).__loaded = true; resolve() })
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout')))
      return
    }
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => { (s as any).__loaded = true; resolve() }
    s.onerror = () => reject(new Error('Failed to load Razorpay checkout'))
    document.body.appendChild(s)
  })
}
