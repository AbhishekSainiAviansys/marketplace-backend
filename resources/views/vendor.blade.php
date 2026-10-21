{{--
    Vendor panel shell (/vendor/*).

    Served by routes/web.php; React Router owns everything below /vendor (see
    resources/js/vendor/App.tsx, <BrowserRouter basename="/vendor">).
--}}
@extends('_spa')

@section('title', 'Vendor · '.config('app.name', 'Marketplace'))

@section('vite')
    @vite(['resources/js/vendor/main.tsx'])
@endsection
