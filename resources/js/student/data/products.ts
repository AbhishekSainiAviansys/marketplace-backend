/** Dummy catalogue for the student storefront (v1 UI-first).
 * Live DB rows (Admin/Vendor panels) replace these once present;
 * src/store/shop.tsx tries GET /products first, then falls back here.
 */

export type DeliveryMode = 'self' | 'thirdparty' | 'school_pickup'

export type Product = {
  id: string
  name: string
  /** Optional commerce identifiers — present on live catalogue rows, absent on dummies. */
  sku?: string | null
  brand?: string | null
  category: string
  price: number
  mrp: number
  rating: number
  reviews: number
  stock: number
  image: string
  delivery: DeliveryMode
  schoolCode: string
  classTag: string
  blurb: string
  specs: { label: string; value: string }[]
}

export const CATEGORIES = ['All', 'Book', 'Book Bundle', 'Water Bottle', 'More'] as const

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`

export const DUMMY_PRODUCTS: Product[] = [
  {
    id: 'book-maths-5', name: 'Class 5 Maths Workbook', category: 'Book',
    price: 249, mrp: 349, rating: 4.6, reviews: 212, stock: 42,
    image: img('photo-1503676260728-1c00da094a0b'), delivery: 'school_pickup',
    schoolCode: 'SCH001', classTag: '5',
    blurb: 'Chapter-wise practice with solved examples, aligned to the syllabus.',
    specs: [
      { label: 'Author', value: 'R. Sharma' }, { label: 'Publisher', value: 'BrightLearn' },
      { label: 'Class', value: '5' }, { label: 'Pages', value: '216' },
    ],
  },
  {
    id: 'book-science-8', name: 'Class 8 Science Textbook', category: 'Book',
    price: 399, mrp: 499, rating: 4.8, reviews: 340, stock: 30,
    image: img('photo-1532012197267-da84d127e765'), delivery: 'self',
    schoolCode: 'SCH001', classTag: '8',
    blurb: 'Full-colour textbook with diagrams, activities and questions.',
    specs: [
      { label: 'Author', value: 'N. Iyer' }, { label: 'Publisher', value: 'BrightLearn' },
      { label: 'Class', value: '8' }, { label: 'Pages', value: '312' },
    ],
  },
  {
    id: 'book-english-grammar', name: 'English Grammar & Composition', category: 'Book',
    price: 199, mrp: 275, rating: 4.5, reviews: 158, stock: 55,
    image: img('photo-1456513080510-7bf3a84b82f8'), delivery: 'thirdparty',
    schoolCode: 'SCH001', classTag: '6',
    blurb: 'Grammar rules, writing formats and practice sets for middle school.',
    specs: [
      { label: 'Author', value: 'A. Dsouza' }, { label: 'Publisher', value: 'WordCraft' },
      { label: 'Class', value: '6' }, { label: 'Pages', value: '188' },
    ],
  },
  {
    id: 'book-atlas', name: 'Student World Atlas', category: 'Book',
    price: 349, mrp: 450, rating: 4.7, reviews: 98, stock: 20,
    image: img('photo-1524661135-423995f22d0b'), delivery: 'self',
    schoolCode: 'SCH001', classTag: '7',
    blurb: 'Maps, flags and facts — the companion for geography classes.',
    specs: [{ label: 'Publisher', value: 'MapHouse' }, { label: 'Class', value: '7' }],
  },
  {
    id: 'bundle-class3-set', name: 'Class 3 Full Book Set (6 books)', category: 'Book Bundle',
    price: 1199, mrp: 1599, rating: 4.9, reviews: 420, stock: 15,
    image: img('photo-1497633762265-9d179a990aa6'), delivery: 'school_pickup',
    schoolCode: 'SCH001', classTag: '3',
    blurb: 'All six Class 3 textbooks in one bundle — save 25%.',
    specs: [{ label: 'Bundle Items', value: 'Maths, EVS, English, Hindi, Art, Notebook x2' }, { label: 'Class', value: '3' }],
  },
  {
    id: 'bundle-class6-combo', name: 'Class 6 Combo (Maths + Science)', category: 'Book Bundle',
    price: 699, mrp: 899, rating: 4.6, reviews: 187, stock: 22,
    image: img('photo-1512820790803-83ca734da794'), delivery: 'school_pickup',
    schoolCode: 'SCH001', classTag: '6',
    blurb: 'Textbook + workbook combo for the two heaviest subjects.',
    specs: [{ label: 'Bundle Items', value: 'Maths TB+WB, Science TB+WB' }, { label: 'Class', value: '6' }],
  },
  {
    id: 'bottle-steel-1l', name: 'Steel Bottle 1L — Insulated', category: 'Water Bottle',
    price: 499, mrp: 699, rating: 4.4, reviews: 264, stock: 60,
    image: img('photo-1602143407151-7111542de6e8'), delivery: 'self',
    schoolCode: 'SCH001', classTag: 'All',
    blurb: 'Keeps water cold 12 hours. Leak-proof, fits cycle holders.',
    specs: [{ label: 'Capacity (ml)', value: '1000' }, { label: 'Material', value: 'Steel' }],
  },
  {
    id: 'bottle-copper-750', name: 'Copper Bottle 750ml', category: 'Water Bottle',
    price: 649, mrp: 849, rating: 4.7, reviews: 141, stock: 35,
    image: img('photo-1523362628745-0c100150b504'), delivery: 'thirdparty',
    schoolCode: 'SCH001', classTag: 'All',
    blurb: 'Traditional copper bottle with food-safe lacquer finish.',
    specs: [{ label: 'Capacity (ml)', value: '750' }, { label: 'Material', value: 'Copper' }],
  },
  {
    id: 'bottle-sport-600', name: 'Sports Sipper 600ml', category: 'Water Bottle',
    price: 249, mrp: 349, rating: 4.3, reviews: 322, stock: 80,
    image: img('photo-1553062407-98eeb64c6a62'), delivery: 'self',
    schoolCode: 'SCH001', classTag: 'All',
    blurb: 'Lightweight BPA-free sipper for the playground.',
    specs: [{ label: 'Capacity (ml)', value: '600' }, { label: 'Material', value: 'Plastic' }],
  },
  {
    id: 'more-geometry-box', name: 'Geometry Box (Premium)', category: 'More',
    price: 149, mrp: 199, rating: 4.5, reviews: 190, stock: 100,
    image: img('photo-1513364776144-60967b0f800f'), delivery: 'school_pickup',
    schoolCode: 'SCH001', classTag: '4',
    blurb: 'Compass, divider, set-squares and pencils in a sturdy case.',
    specs: [{ label: 'Pieces', value: '9' }],
  },
  {
    id: 'more-school-bag', name: 'Ergonomic School Bag 28L', category: 'More',
    price: 899, mrp: 1299, rating: 4.6, reviews: 275, stock: 25,
    image: img('photo-1588072432836-e10032774350'), delivery: 'thirdparty',
    schoolCode: 'SCH001', classTag: 'All',
    blurb: 'Padded back, rain cover and 3 compartments for heavy book days.',
    specs: [{ label: 'Capacity', value: '28 L' }, { label: 'Rain cover', value: 'Included' }],
  },
  {
    id: 'book-hindi-4', name: 'Class 4 Hindi Vyakaran', category: 'Book',
    price: 179, mrp: 240, rating: 4.4, reviews: 112, stock: 48,
    image: img('photo-1457369804613-52c61a468e7d'), delivery: 'school_pickup',
    schoolCode: 'SCH001', classTag: '4',
    blurb: 'Saral vyakaran with abhyas prashn for primary classes.',
    specs: [{ label: 'Author', value: 'M. Gupta' }, { label: 'Publisher', value: 'Shabd' }, { label: 'Class', value: '4' }],
  },
]

