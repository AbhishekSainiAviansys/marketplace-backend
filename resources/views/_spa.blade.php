{{--
    Shared HTML shell for the four panels.

    Each panel has its own Blade file (admin/vendor/school/student) which
    @extends this and only supplies @section('title') + @section('entry') - the
    single Vite input it needs. Keeping the <head> here means the four shells can
    never drift apart.

    One domain, one origin: the SPA and the API are served by the same Laravel
    app, so the JS uses a relative base URL ('/api/v1') - no CORS, no proxy.

    NOTE: do NOT let `public/hot` exist in production. When that file is present
    @vite emits dev-server URLs (http://[::1]:5173/...) and every panel renders a
    blank page unless `npm run dev` is running. Delete it before deploying.
--}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>@yield('title', config('app.name', 'Marketplace'))</title>
    @yield('meta')

    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

    @viteReactRefresh
    @yield('vite')
</head>
<body class="h-full antialiased">
    <div id="root"></div>
</body>
</html>
