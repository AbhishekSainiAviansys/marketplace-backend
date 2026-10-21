/**
 * Shared defaults for admin-managed site pages / contact (single source of
 * truth for both the Admin editor and the student storefront reader).
 * Plain types + constants only — no UI imports, safe in every bundle.
 */
export type PageKey = 'privacy' | 'return' | 'refund' | 'terms'
export type PageBody = { title: string; body: string }
export type ContactInfo = { phone: string; email: string; address: string; hours: string }
export type SocialLink = { network: string; url: string }

export const PAGE_LABELS: Record<PageKey, string> = {
  privacy: 'Privacy Policy',
  return: 'Return Policy',
  refund: 'Refund Policy',
  terms: 'Terms & Conditions',
}

export const DEFAULT_PAGES: Record<PageKey, PageBody> = {
  privacy: {
    title: 'Privacy Policy',
    body: 'We collect only what your order needs: name, class, school and contact details.\n\nOrder details are used for packing, school delivery and support — never sold or shared for marketing.\n\nYou can ask for your data to be corrected or deleted at any time via the contact details below.',
  },
  return: {
    title: 'Return Policy',
    body: 'Unused items in original condition can be returned within 7 days of pickup.\n\nBring the item back with your order ID to the school office, or contact us to arrange a return.\n\nDamaged or wrong items are always replaced free of charge.',
  },
  refund: {
    title: 'Refund Policy',
    body: 'Approved refunds are processed within 5–7 working days.\n\nOnline payments go back to the original UPI/card account. Cash on Delivery orders are refunded via UPI after pickup verification.\n\nShipping/pickup itself is free, so there are no deductions on eligible refunds.',
  },
  terms: {
    title: 'Terms & Conditions',
    body: 'Prices and availability shown in the store are final at checkout.\n\nOrders are confirmed on payment (online) or on pickup (Cash on Delivery).\n\nSchool pickup slots are announced class-wise; unclaimed boxes are held for 7 days.',
  },
}

export const DEFAULT_CONTACT: ContactInfo = {
  phone: '+91 98765 43210',
  email: 'care@schoolshop.in',
  address: 'School Shop, Main Market Road',
  hours: 'Mon–Sat · 9 AM – 7 PM',
}

export const NETWORKS = ['Facebook', 'Instagram', 'X', 'YouTube', 'LinkedIn', 'WhatsApp']

/** Footer policy links — route per page key. */
export const PAGE_ROUTES: { key: PageKey; to: string }[] = [
  { key: 'privacy', to: '/privacy-policy' },
  { key: 'return', to: '/return-policy' },
  { key: 'refund', to: '/refund-policy' },
  { key: 'terms', to: '/terms' },
]
