/**
 * Student storefront (:5183).
 *
 * Public shop (home/details) + register/login per diagram
 * (name, class, school_code/new school, whatsapp, password, email OTP)
 * + cart / wishlist / checkout (Online/COD) / orders / tracking.
 * v1 is UI-first: dummy catalogue + localStorage cart/orders; the shop hook
 * swaps in live GET /products rows automatically when the DB has any.
 */
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@lib/auth'
import { BrandProvider } from '@lib/brand'
import { ShopProvider } from './store/shop'
import { Shell } from './components/Shell'
import { Home } from './pages/Home'
import { Shop } from './pages/Shop'
import { Details } from './pages/Details'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Cart } from './pages/Cart'
import { Wishlist } from './pages/Wishlist'
import { Checkout } from './pages/Checkout'
import { Orders, Track } from './pages/Orders'
import { Contact, Privacy, RefundPolicy, ReturnPolicy, Terms } from './pages/InfoPage'
import { Sell } from './pages/Sell'
import { Directory } from './pages/Directory'
import { DirectoryDetail } from './pages/DirectoryDetail'

export default function App({ basename = '/' }: { basename?: string }) {
  return (
    <AuthProvider>
      <BrandProvider>
        <ShopProvider>
          <BrowserRouter basename={basename}>
            <Shell>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:id" element={<Details />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/track" element={<Track />} />
                <Route path="/privacy-policy" element={<Privacy />} />
                <Route path="/return-policy" element={<ReturnPolicy />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/sell" element={<Sell />} />
                <Route path="/directory" element={<Directory />} />
                <Route path="/directory/:kind/:id" element={<DirectoryDetail />} />
                <Route path="*" element={<Home />} />
              </Routes>
            </Shell>
          </BrowserRouter>
        </ShopProvider>
      </BrandProvider>
    </AuthProvider>
  )
}


