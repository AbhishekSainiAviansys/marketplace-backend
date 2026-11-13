<?php

namespace App\Http\Controllers;

use App\Models\Credential;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class PaymentWebhookController extends Controller
{
    /**
     * Public Razorpay webhook endpoint.
     * Secret comes from the credentials table (api column).
     */
    public function razorpay(Request $r, OrderService $orders)
    {
        // Pull the webhook secret from the credentials table
        $secret = '';
        if (Schema::hasTable('credentials')) {
            $row = Credential::query()->active()->razorpay()->first();
            $secret = $row?->api ?? '';
        }

        $sig = $r->header('X-Razorpay-Signature', '');
        $payload = $r->getContent();

        if ($secret === '') {
            Log::warning('Razorpay webhook received but no secret configured');
            return response()->json(['message' => 'Razorpay webhook is not configured.'], 503);
        }

        // Verify HMAC signature
        $expected = hash_hmac('sha256', $payload, $secret);
        $decoded = json_decode($payload, true) ?: [];
        $event = $decoded['event'] ?? 'unknown';

        Log::info('Razorpay webhook received', [
            'event' => $event,
            'signature_present' => $sig !== '',
            'valid' => hash_equals($expected, $sig),
        ]);

        if ($sig === '' || ! hash_equals($expected, $sig)) {
            Log::warning('Razorpay webhook signature mismatch', [
                'event' => $event,
            ]);
            return response()->json(['message' => 'Invalid signature'], 400);
        }

        // Log to payment_logs table if it exists
        if (Schema::hasTable('payment_logs')) {
            \DB::table('payment_logs')->insert([
                'event' => $event,
                'payload' => $payload,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $entity = $decoded['payload']['payment']['entity']
            ?? $decoded['payload']['refund']['entity']
            ?? $decoded['payload']['transfer']['entity']
            ?? [];

        $providerOrderId = $entity['order_id'] ?? null;
        $paymentId = $entity['id'] ?? null;
        $transferId = $decoded['payload']['transfer']['entity']['id'] ?? null;

        // Look up the order
        $order = null;
        if ($providerOrderId) {
            $order = Order::where('provider_order_id', $providerOrderId)->first();
        } elseif ($paymentId) {
            $order = Order::where('payment_ref', $paymentId)->first();
        }

        if ($order) {
            // Payment events
            if ($event === 'payment.captured') {
                if ($paymentId && $order->payment_status === 'pending') {
                    // Fetch full payment details from Razorpay API to be consistent
                    // with the verify() path which passes the full array
                    try {
                        $creds = $this->getRazorpayCredentials();
                        $paymentResponse = Http::connectTimeout(10)
                            ->timeout(30)
                            ->withBasicAuth($creds['key_id'], $creds['key_secret'])
                            ->get("https://api.razorpay.com/v1/payments/{$paymentId}");

                        if ($paymentResponse->successful()) {
                            $payment = $paymentResponse->json();
                            $orders->confirmPayment($order, $payment);
                            Log::info('Payment confirmed via webhook', [
                                'order_code' => $order->order_code,
                                'payment_id' => $paymentId,
                            ]);
                        } else {
                            Log::error('Webhook: failed to fetch payment from Razorpay', [
                                'order_code' => $order->order_code,
                                'payment_id' => $paymentId,
                                'http_status' => $paymentResponse->status(),
                            ]);
                        }
                    } catch (\Throwable $e) {
                        Log::error('Webhook: exception fetching payment', [
                            'order_code' => $order->order_code,
                            'payment_id' => $paymentId,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            } elseif ($event === 'payment.failed') {
                $orders->releasePaymentReservation($order, 'failed');
                Log::info('Payment failed via webhook', [
                    'order_code' => $order->order_code,
                ]);
            } elseif (str_contains($event, 'refund')) {
                $order->update(['payment_status' => 'refunded']);
                Log::info('Refund processed via webhook', [
                    'order_code' => $order->order_code,
                ]);
            }
        }

        // Transfer events (for payment split tracking)
        if (str_starts_with($event, 'transfer.')) {
            $this->handleTransferEvent($event, $decoded, $order, $transferId);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Handle Razorpay transfer events (Route API splits).
     */
    protected function handleTransferEvent(string $event, array $decoded, ?Order $order, ?string $transferId): void
    {
        $transferEntity = $decoded['payload']['transfer']['entity'] ?? [];
        $settlementStatus = $transferEntity['on_hold'] ? 'on_hold' : ($transferEntity['settled'] ? 'settled' : 'pending');

        Log::info('Razorpay transfer event', [
            'event' => $event,
            'order_code' => $order?->order_code,
            'transfer_id' => $transferId,
            'amount' => $transferEntity['amount'] ?? null,
            'account' => $transferEntity['account'] ?? null,
            'settlement_status' => $settlementStatus,
        ]);

        // If you have an order_transfers table, update the settlement status here
        if (Schema::hasTable('order_transfers') && $transferId) {
            \DB::table('order_transfers')->updateOrInsert(
                ['transfer_id' => $transferId],
                [
                    'order_id' => $order?->id,
                    'order_code' => $order?->order_code,
                    'destination_account' => $transferEntity['account'] ?? null,
                    'amount' => $transferEntity['amount'] ?? 0,
                    'status' => $settlementStatus,
                    'event' => $event,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }

    /**
     * Get Razorpay credentials (duplicated from PaymentController to keep
     * the webhook controller self-contained).
     */
    protected function getRazorpayCredentials(): array
    {
        $credential = Credential::query()
            ->active()
            ->razorpay()
            ->first();

        if (!$credential || empty($credential->public) || empty($credential->private)) {
            throw new \RuntimeException('Razorpay credentials are not configured.');
        }

        return [
            'key_id' => $credential->public,
            'key_secret' => $credential->private,
        ];
    }
}