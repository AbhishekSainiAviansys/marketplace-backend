/** Dummy catalogue for the student storefront (v1 UI-first).
 * Live DB rows (Admin/Vendor panels) replace these once present;
 * src/store/shop.tsx tries GET /products first, then falls back here.
 */

export type DeliveryMode = 'self' | 'thirdparty' | 'school_pickup'

export type ProductStockRow = {
  id?: number
  variant_id?: number | null
  colour: string
  color_code?: string | null
  size: string
  quantity: number
  stock: number
  qty: number
}

export type Product = {
  id: string
  /** Numeric DB id for live catalogue rows; used for payment verification. */
  dbId?: number
  name: string
  /** Optional commerce identifiers — present on live catalogue rows, absent on dummies. */
  sku?: string | null
  brand?: string | null
  category: string
  subCategory?: string | null
  images?: string[]
  price: number
  mrp: number
  rating: number
  reviews: number
  stock: number
  is_variant?: boolean
  image: string
  delivery: DeliveryMode
  deliveryCharge?: number | null
  schoolCode: string
  classTag: string
  blurb: string
  specs: { label: string; value: string }[]
  /** Colour/size rows from product_stocks (live catalogue rows only). */
  stock_rows?: ProductStockRow[]
  /** Colour/size variants with per-variant stock (live catalogue rows only). */
  variants?: Array<{
    id?: string | number
    color?: string | null
    color_code?: string | null
    size?: string | null
    stock?: number | null
    price?: number | null
    sku?: string | null
  }>
}

export const CATEGORIES = ['All', 'Book', 'Book Bundle', 'Water Bottle', 'More'] as const

export const DUMMY_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Organic Cotton T-Shirt',
    category: 'Clothing',
    price: 450,
    mrp: 799,
    rating: 4.5,
    reviews: 32,
    stock: 50,
    image: '/images/products/shirt1.jpg',
    delivery: 'self',
    deliveryCharge: 0,
    schoolCode: '5',
    classTag: '6',
    blurb: '100% Organic Cotton, Comfortable fit',
    specs: [{ label: 'Material', value: 'Cotton' }],
    variants: [
      { id: 'var-1', color: 'Red', size: 'S', stock: 10, price: 450, sku: 'TSHIRT-R-S' },
      { id: 'var-2', color: 'Red', size: 'M', stock: 15, price: 450, sku: 'TSHIRT-R-M' },
      { id: 'var-3', color: 'Red', size: 'L', stock: 20, price: 450, sku: 'TSHIRT-R-L' },
      { id: 'var-4', color: 'Blue', size: 'S', stock: 8, price: 450, sku: 'TSHIRT-B-S' },
      { id: 'var-5', color: 'Blue', size: 'M', stock: 12, price: 450, sku: 'TSHIRT-B-M' },
      { id: 'var-6', color: 'Blue', size: 'L', stock: 18, price: 450, sku: 'TSHIRT-B-L' },
    ],
  },
  {
    id: 'prod-2',
    name: 'Stainless Steel Water Bottle',
    category: 'Accessories',
    price: 250,
    mrp: 499,
    rating: 4.8,
    reviews: 45,
    stock: 100,
    image: '/images/products/bottle1.jpg',
    delivery: 'self',
    deliveryCharge: 0,
    schoolCode: '5',
    classTag: '7',
    blurb: 'Double-walled insulation, Keeps drinks cold for 24h',
    specs: [{ label: 'Material', value: 'Stainless Steel' }],
    variants: [
      { id: 'var-1', color: 'Silver', size: '500ml', stock: 50, price: 250, sku: 'BOTTLE-S-500' },
      { id: 'var-2', color: 'Silver', size: '750ml', stock: 40, price: 300, sku: 'BOTTLE-S-750' },
      { id: 'var-3', color: 'Black', size: '500ml', stock: 45, price: 250, sku: 'BOTTLE-B-500' },
      { id: 'var-4', color: 'Black', size: '750ml', stock: 35, price: 300, sku: 'BOTTLE-B-750' },
    ],
  },
  {
    id: 'prod-3',
    name: 'Canvas School Bag',
    category: 'Bags',
    price: 850,
    mrp: 1200,
    rating: 4.3,
    reviews: 21,
    stock: 30,
    image: '/images/products/bag1.jpg',
    delivery: 'thirdparty',
    deliveryCharge: 49,
    schoolCode: '5',
    classTag: '8',
    blurb: 'Heavy-duty canvas, Multiple compartments',
    specs: [{ label: 'Material', value: 'Canvas' }],
    variants: [
      { id: 'var-1', color: 'Green', size: 'One Size', stock: 15, price: 850, sku: 'BAG-G-OS' },
      { id: 'var-2', color: 'Brown', size: 'One Size', stock: 10, price: 850, sku: 'BAG-B-OS' },
      { id: 'var-3', color: 'Blue', size: 'One Size', stock: 12, price: 850, sku: 'BAG-Blue-OS' },
    ],
  },
  {
    id: 'prod-4',
    name: 'Notebook Set - 5 Books',
    category: 'Stationery',
    price: 150,
    mrp: 300,
    rating: 4.6,
    reviews: 57,
    stock: 200,
    image: '/images/products/notebook1.jpg',
    delivery: 'school_pickup',
    deliveryCharge: 0,
    schoolCode: '5',
    classTag: '6',
    blurb: '5 notebooks with different subjects, 100 pages each',
    specs: [{ label: 'Type', value: 'Notebook' }],
    variants: [
      { id: 'var-1', color: 'Red', size: 'Set of 5', stock: 80, price: 150, sku: 'NOTEBOOK-R-5' },
      { id: 'var-2', color: 'Blue', size: 'Set of 5', stock: 70, price: 150, sku: 'NOTEBOOK-B-5' },
      { id: 'var-3', color: 'Green', size: 'Set of 5', stock: 60, price: 150, sku: 'NOTEBOOK-G-5' },
    ],
  },
  {
    id: 'prod-5',
    name: 'Ceramic Mug - Set of 2',
    category: 'Kitchen',
    price: 200,
    mrp: 350,
    rating: 4.4,
    reviews: 38,
    stock: 150,
    image: '/images/products/mug1.jpg',
    delivery: 'self',
    deliveryCharge: 0,
    schoolCode: '5',
    classTag: '7',
    blurb: 'Microwave safe, Dishwasher friendly, Set of 2',
    specs: [{ label: 'Material', value: 'Ceramic' }],
    variants: [
      { id: 'var-1', color: 'White', size: 'Set of 2', stock: 100, price: 200, sku: 'MUG-W-2' },
      { id: 'var-2', color: 'Black', size: 'Set of 2', stock: 80, price: 200, sku: 'MUG-B-2' },
      { id: 'var-3', color: 'Blue', size: 'Set of 2', stock: 90, price: 200, sku: 'MUG-Blue-2' },
    ],
  },
]

