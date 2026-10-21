/**
 * Vite entry for the ADMIN panel.
 *
 * Each panel gets its own entry + its own Blade shell so a page only downloads
 * the code it needs. `/` inside this app is really `/admin/`, hence the basename
 * (routes/web.php maps /admin/* -> resources/views/admin.blade.php).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App basename="/admin" />
  </StrictMode>,
)
