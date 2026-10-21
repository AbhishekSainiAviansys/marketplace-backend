{{--
    School panel shell (/school/*).

    Served by routes/web.php; React Router owns everything below /school (see
    resources/js/school/App.tsx, <BrowserRouter basename="/school">).
--}}
@extends('_spa')

@section('title', 'School · '.config('app.name', 'Marketplace'))

@section('vite')
    @vite(['resources/js/school/main.tsx'])
@endsection
