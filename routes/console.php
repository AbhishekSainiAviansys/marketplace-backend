<?php

use App\Services\OrderService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(fn () => app(OrderService::class)->expirePaymentReservations())
    ->everyMinute()
    ->name('expire-payment-reservations')
    ->withoutOverlapping();
