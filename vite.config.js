import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    plugins: [
        react(),
        laravel({
            // One entry per panel. Each has its own Blade shell, so a page only
            // downloads the JS it needs (e.g. the public storefront never ships
            // the admin/vendor/school bundles). Vite hoists everything shared
            // (react, react-router, axios, lib/, ui/) into a common chunk, so
            // those deps are NOT duplicated across the four entries.
            input: [
                'resources/js/admin/main.tsx',
                'resources/js/vendor/main.tsx',
                'resources/js/school/main.tsx',
                'resources/js/coaching/main.tsx',
                'resources/js/student/main.tsx',
            ],
            refresh: true,
        }),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@lib': fileURLToPath(new URL('./resources/js/lib', import.meta.url)),
            '@ui': fileURLToPath(new URL('./resources/js/ui/ui.tsx', import.meta.url)),
        },
    },
    server: {
        // In dev the SPA is served by Vite while the API runs on :8001.
        // Proxy /api (and /storage for uploaded images) so the browser stays
        // same-origin — no CORS, and axios can use a relative base URL.
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8001',
                changeOrigin: true,
            },
            '/storage': {
                target: 'http://127.0.0.1:8001',
                changeOrigin: true,
            },
        },
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});

