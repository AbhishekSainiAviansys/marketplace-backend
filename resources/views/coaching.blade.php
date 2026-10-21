{{--
    Coaching institute panel (/coaching/*).

    Served by routes/web.php; React Router owns everything below /coaching (see
    resources/js/coaching/App.tsx, <BrowserRouter basename="/coaching">).
--}}
@extends('_spa')

@section('title', 'Coaching · '.config('app.name', 'Marketplace'))

@section('vite')
    @vite(['resources/js/coaching/main.tsx'])
@endsection