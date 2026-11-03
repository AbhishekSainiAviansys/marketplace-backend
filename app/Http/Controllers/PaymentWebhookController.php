<?php

namespace App\Http\Controllers;

use App\Models\Credential;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class PaymentWebhookController extends Controller
{
    // Public Razorpay webhook - secret from credentials table
    public function razorpay(Request $r, OrderService $orders)
    {
        $secret = '';
        if (Schema::hasTable('credentials')) {
            $row = Credential::query()->active()->razorpay()->first();
            $secret = $row?->api ?? '';
        }
        $sig = $r->header('X-Razorpay-Signature', '');
        $payload = $r->getContent();
        if ($secret === '') {
            return response()->json(['message' => 'Razorpay webhook is not configured.'], 503);
        }
        $expected = hash_hmac('sha256', $payload, $secret);
        \Log::info('Razorpay webhook', ['valid' => $sig === $expected, 'event' => json_decode($payload, true)['event'] ?? null]);
        if ($sig === '' || ! hash_equals($expected, $sig)) {
            return response()->json(['message' => 'Invalid signature'], 400);
        }
        $data = json_decode($payload, true) ?: [];
        $event = $data['event'] ?? 'unknown';
        if (Schema::hasTable('payment_logs')) {
            \DB::table('payment_logs')->insert(['event' => $event, 'payload' => $payload, 'created_at' => now()]);
        }

        $entity = $data['payload']['payment']['entity'] ?? $data['payload']['refund']['entity'] ?? [];
        $providerOrderId = $entity['order_id'] ?? null;
        $paymentId = $entity['id'] ?? null;

        $order = null;
        if ($providerOrderId) {
            $order = Order::where('provider_order_id', $providerOrderId)->first();
        } elseif ($paymentId) {
            $order = Order::where('payment_ref', $paymentId)->first();
        }

        if ($order) {
            if ($event === 'payment.captured') {
                if ($paymentId && $order->payment_status === 'pending') {
                    $orders->confirmPayment($order, $paymentId);
                }
            } elseif ($event === 'payment.failed') {
                $orders->releasePaymentReservation($order, 'failed');
            } elseif (str_contains($event, 'refund')) {
                $order->update(['payment_status' => 'refunded']);
            }
        }

        return response()->json(['ok' => true]);
    }
}
