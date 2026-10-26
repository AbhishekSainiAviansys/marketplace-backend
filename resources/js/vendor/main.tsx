/**
 * Vite entry for the VENDOR panel.
 *
 * Each panel gets its own entry + its own Blade shell so a page only downloads
 * the code it needs. `/` inside this app is really `/vendor/`, hence the basename
 * (routes/web.php maps /vendor/* -> resources/views/vendor.blade.php).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import App from './App'

import { ToastProvider } from '@ui'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App basename="/vendor" />
    </ToastProvider>
  </StrictMode>,
)
