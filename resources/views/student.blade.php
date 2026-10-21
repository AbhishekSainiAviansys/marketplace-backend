{{--
    Student storefront shell.

    Served at BOTH `/` (the public shop home) and `/student/*`, so the React app
    keeps basename="/" (see resources/js/student/App.tsx). routes/web.php points
    both paths here.
--}}
@extends('_spa')

@section('title', config('app.name', 'Marketplace').' · School Store — Books, Bundles & Supplies for Students')

@section('meta')
    <meta name="description" content="School essentials for students — books, bundles, bottles and more with free school pickup and COD. Plus the directory of schools & coaching institutes near you.">
    <meta name="keywords" content="school books, textbooks, stationery, water bottles, school supplies, student store, school pickup, cash on delivery, schools directory, coaching institutes near me">
    <link rel="canonical" href="{{ config('app.url', rtrim(env('APP_URL', 'http://127.0.0.1:8000'), '/')) }}/">

    <meta property="og:type" content="website">
    <meta property="og:title" content="{{ config('app.name', 'Marketplace') }} · School Store">
    <meta property="og:description" content="Books, bundles and bottles linked to your school — pay online or COD, collect at school or home.">
    <meta property="og:url" content="{{ config('app.url', rtrim(env('APP_URL', 'http://127.0.0.1:8000'), '/')) }}/">
    <meta property="og:site_name" content="{{ config('app.name', 'Marketplace') }}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{ config('app.name', 'Marketplace') }} · School Store">
    <meta name="twitter:description" content="Books, bundles and bottles linked to your school — pay online or COD, collect at school or home.">

    <script type="application/ld+json">
        {
            "@@context": "https://schema.org",
            "@@type": "Organization",
            "name": "{{ config('app.name', 'Marketplace') }}",
            "url": "{{ config('app.url', rtrim(env('APP_URL', 'http://127.0.0.1:8000'), '/')) }}/",
            "logo": "{{ config('app.url', rtrim(env('APP_URL', 'http://127.0.0.1:8000'), '/')) }}/favicon.svg"
        }
    </script>
    <script type="application/ld+json">
        {
            "@@context": "https://schema.org",
            "@@type": "WebSite",
            "name": "{{ config('app.name', 'Marketplace') }}",
            "url": "{{ config('app.url', rtrim(env('APP_URL', 'http://127.0.0.1:8000'), '/')) }}",
            "potentialAction": {
                "@@type": "SearchAction",
                "target": "{{ config('app.url', rtrim(env('APP_URL', 'http://127.0.0.1:8000'), '/')) }}/directory?q={search_term_string}",
                "query-input": "required name=search_term_string"
            }
        }
    </script>
@endsection

@section('vite')
    @vite(['resources/js/student/main.tsx'])
@endsection
