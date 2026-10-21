<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SitemapController;

/*
|--------------------------------------------------------------------------
| SPA shells — one Blade view + one JS bundle per panel
|--------------------------------------------------------------------------
|
| Four panels, four entry points (resources/js/{admin,vendor,school,student}/
| main.tsx) and four Blade shells. Each panel owns client-side routing below
| its own prefix, so a page only downloads the JS it actually needs — the
| public storefront never ships the admin/vendor/school bundles.
|
| React Router runs with <BrowserRouter basename="/{panel}">, so every existing
| `pathname === '/'` / `<Link to="/products">` inside a panel keeps working
| untouched; the basename strips the prefix for it.
|
| `/api/*` is registered separately in routes/api.php and is deliberately NOT
| matched here, so an unknown API path still returns a JSON 404 instead of
| falling through to an HTML page.
|
| Single-domain note: `public/hot` must NOT exist in production. While it does,
| @vite emits dev-server URLs (http://[::1]:5173/...) and these pages render
| blank unless `npm run dev` is running.
|
*/

// Public storefront — served at both "/" and "/student", so its basename is "/".
Route::view('/', 'student')->name('home');
Route::get('/robots.txt', [SitemapController::class, 'robots'])->name('seo.robots');
Route::get('/sitemap.xml', [SitemapController::class, 'sitemap'])->name('seo.sitemap');
Route::view('/student/{any?}', 'student')
    ->where('any', '.*')
    ->name('student');

// Admin panel.
Route::view('/admin/{any?}', 'admin')
    ->where('any', '.*')
    ->name('admin');

// Vendor panel.
Route::view('/vendor/{any?}', 'vendor')
    ->where('any', '.*')
    ->name('vendor');

// School panel.
Route::view('/school/{any?}', 'school')
    ->where('any', '.*')
    ->name('school');

// Coaching institute panel.
Route::view('/coaching/{any?}', 'coaching')
    ->where('any', '.*')
    ->name('coaching');

/*
| Anything else falls back to the storefront, so a browser refresh or a stale
| bookmark on an unknown path never hard-404s - React Router renders it and the
| student app's own <Route path="*"> decides.
|
| /api, /build and /storage are excluded: those must keep answering as
| themselves (JSON / hashed assets / uploaded files), never as HTML. Real
| static files under public\ are served by the web server before Laravel, so
| this only affects genuinely unknown URLs.
*/
Route::view('/{any?}', 'student')
    ->where('any', '^(?!api(/|$)|build(/|$)|storage(/|$)|favicon\.svg$).*$')
    ->name('spa.fallback');


