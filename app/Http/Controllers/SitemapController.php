<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\School;
use App\Models\CoachingInstitute;
use Illuminate\Http\Request;

/**
 * Public SEO endpoints for the student storefront:
 *
 *   GET /robots.txt   - allow all, point at sitemap
 *   GET /sitemap.xml  - home, shop, products, directory listings + details
 *
 * Deliberately unauthenticated so search engine crawlers can fetch them
 * without cookies or sessions.
 */
class SitemapController extends Controller
{
    public function robots()
    {
        $host = rtrim(config('app.url', env('APP_URL', 'http://127.0.0.1:8001')), '/');

        return response(view('seo.robots', ['sitemap' => $host . '/sitemap.xml']))
            ->header('Content-Type', 'text/plain');
    }

    public function sitemap(Request $r)
    {
        $host = rtrim(config('app.url', env('APP_URL', 'http://127.0.0.1:8001')), '/');
        $now = now()->toDateString();

        $urls = [
            $host . '/',
            $host . '/shop',
            $host . '/directory',
            $host . '/privacy-policy',
            $host . '/return-policy',
            $host . '/refund-policy',
            $host . '/terms',
            $host . '/contact',
        ];

        // Every active product has its own details page (/product/:id).
        foreach (Product::where('is_active', 1)->orderBy('id', 'desc')->limit(2000)->pluck('id') as $id) {
            $urls[] = "$host/product/$id";
        }

        // Every approved institute has a directory detail page.
        foreach (School::where('onboarding_status', 'approved')->pluck('id') as $id) {
            $urls[] = "$host/directory/school/$id";
        }
        foreach (CoachingInstitute::where('onboarding_status', 'approved')->pluck('id') as $id) {
            $urls[] = "$host/directory/coaching/$id";
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        foreach ($urls as $url) {
            $xml .= '  <url>' . "\n";
            $xml .= '    <loc>' . e($url) . '</loc>' . "\n";
            $xml .= '    <lastmod>' . $now . '</lastmod>' . "\n";
            $xml .= '    <changefreq>weekly</changefreq>' . "\n";
            $xml .= '  </url>' . "\n";
        }
        $xml .= '</urlset>' . "\n";

        return response($xml)->header('Content-Type', 'application/xml');
    }
}
