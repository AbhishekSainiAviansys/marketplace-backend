/**
 * Vite entry for the STUDENT storefront.
 *
 * Each panel gets its own entry + its own Blade shell so a page only downloads
 * the code it needs. The storefront is served at both `/` and `/student`, so its
 * basename stays "/" and routes/web.php maps both to student.blade.php.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App basename="/" />
  </StrictMode>,
)
