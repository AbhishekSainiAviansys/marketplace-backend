/** Home-page content: ads,Ticker,testimonials,schedule + stock video picks.
 * Swap URLs here to re-theme — no component edits needed.
 */

export const HERO_VIDEO =
  'https://cdn.coverr.co/videos/coverr-studying-in-a-library-5243/1080p.mp4'
export const HERO_POSTER =
  'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1600&q=80'

export const LIVE_POSTER =
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80'

export const TICKER_ITEMS = [
  'FLAT 20% OFF on Book Bundles',
  'Free pickup from your school',
  'COD available — pay at pickup',
  'Exam-week sale ends Sunday',
  'New here? Register with your school code',
  'Steel bottles from ₹249',
]

export type Promo = {
  tag: string; title: string; sub: string; cta: string; to: string;
  image: string; tint: string; countdown?: boolean; tilt: 'l' | 'r';
}

export const PROMOS: Promo[] = [
  {
    tag: 'Exam-week sale', title: 'Bundle up, save 25%',
    sub: 'Full class sets — Maths, Science, English + notebooks in one box.',
    cta: 'Shop bundles', to: '/shop?cat=Book Bundle',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=80',
    tint: 'from-indigo-950/85 via-indigo-900/55 to-transparent',
    countdown: true, tilt: 'l',
  },
  {
    tag: 'Hydration upgrade', title: 'Steel bottles from ₹249',
    sub: 'Leak-proof, playground-tough. Mrs. Sharma approved.',
    cta: 'Shop bottles', to: '/shop?cat=Water Bottle',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80',
    tint: 'from-emerald-950/85 via-emerald-900/55 to-transparent', tilt: 'r',
  },
  {
    tag: 'New school?', title: 'Get your school code',
    sub: 'Register in 2 minutes — class, code, WhatsApp, OTP. Done.',
    cta: 'Register free', to: '/school/register',
    image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=900&q=80',
    tint: 'from-amber-950/85 via-amber-900/55 to-transparent', tilt: 'l',
  },
]

/** Full-width rotating banner slides (mitticool-style gallery banners).
 * CTA `to` values are real routes/query links only. */
export type Banner = {
  eyebrow: string; title: string; highlight: string; sub: string;
  cta: string; to: string; image: string; tint: string; chip?: string;
}

export const BANNERS: Banner[] = [
  {
    eyebrow: 'Season sale', title: 'Full class sets at', highlight: '25% off',
    sub: 'Maths, Science, English + notebooks — one box, one price, school pickup.',
    cta: 'Shop bundles', to: '/shop?cat=Book Bundle',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1600&q=80',
    tint: 'from-indigo-950/90 via-indigo-900/60 to-transparent', chip: 'Ends Sunday',
  },
  {
    eyebrow: 'Hydration upgrade', title: 'Steel bottles from', highlight: '₹249',
    sub: 'Leak-proof, playground-tough, fits every school bag side pocket.',
    cta: 'Shop bottles', to: '/shop?cat=Water Bottle',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1600&q=80',
    tint: 'from-emerald-950/90 via-emerald-900/60 to-transparent', chip: 'New colours',
  },
  {
    eyebrow: 'Zero delivery fee', title: 'Free pickup from', highlight: 'your school',
    sub: 'Order today, collect at the school office this week. COD also works at pickup.',
    cta: 'See top deals', to: '/shop?sort=off',
    image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80',
    tint: 'from-amber-950/90 via-amber-900/55 to-transparent', chip: 'Most loved',
  },
]

export type MenuLink = { label: string; to: string; hint?: string }
export type Menu = { label: string; to?: string; items?: MenuLink[] }

/** Desktop nav (mitticool-style): category dropdowns + direct links.
 * Shop links land on the dedicated /shop catalogue page. */
export const SHOP_MENUS: Menu[] = [
  {
    label: 'Shop', items: [
      { label: 'All products', to: '/shop?cat=All', hint: 'Everything' },
      { label: 'Books', to: '/shop?cat=Book', hint: 'Workbooks & guides' },
      { label: 'Book bundles', to: '/shop?cat=Book Bundle', hint: 'Full class sets' },
      { label: 'Water bottles', to: '/shop?cat=Water Bottle', hint: 'Steel & school-proof' },
      { label: 'More for school', to: '/shop?cat=More', hint: 'Kits, stationery' },
    ],
  },
  { label: 'Top deals', to: '/shop?sort=off' },
  { label: 'Bundles', to: '/shop?cat=Book Bundle' },
  {
    label: 'Orders', items: [
      { label: 'My orders', to: '/orders', hint: 'History & status' },
      { label: 'Track order', to: '/track', hint: 'Live delivery' },
    ],
  },
  { label: 'Wishlist', to: '/wishlist' },
  { label: 'Cart', to: '/cart' },
  { label: 'Checkout', to: '/checkout' },
  { label: 'Sell with us', to: '/sell' },
]

export const SCHEDULE = [
  { time: 'Today · 5 PM', title: 'Class 6 Science revision', by: 'Live demo class' },
  { time: 'Tomorrow · 4 PM', title: 'How school pickup works', by: '2-min walkthrough' },
  { time: 'Sunday · 11 AM', title: 'Bundle unboxing + Q&A', by: 'Parent special' },
]

export const QUOTES = [
  {
    quote: 'Ordered the full Class 3 set on Monday, picked it up at the school office on Wednesday. Zero delivery fee.',
    name: 'Priya N.', role: 'Parent · Class 3',
  },
  {
    quote: 'COD at pickup is perfect — my son shows the order ID, I pay UPI, done. Feels made for schools.',
    name: 'Rahul V.', role: 'Parent · Class 6',
  },
  {
    quote: 'Finally one list per class instead of ten shop visits. The bundle discount actually shows.',
    name: 'Mrs. Sharma', role: 'Teacher · Class 5',
  },
]
