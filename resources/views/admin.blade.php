{{--
    Admin panel shell (/admin/*).

    Served by routes/web.php; React Router owns everything below /admin (see
    resources/js/admin/App.tsx, <BrowserRouter basename="/admin">).
--}}
@extends('_spa')

@section('title', 'Admin · '.config('app.name', 'Marketplace'))

@section('vite')
    @vite(['resources/js/admin/main.tsx'])
@endsection
