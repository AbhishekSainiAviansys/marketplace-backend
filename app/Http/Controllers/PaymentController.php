<?php

namespace App\Http\Controllers;

use App\Models\Credential;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

class PaymentController extends Controller
{
    protected function razorpayCredentials(): array
    {
        if (Schema::hasTable('credentials')) {
            $row = Credential::query()
                ->active()
                ->razorpay()
                ->first();
            if ($row && ! empty($row->public) && ! empty($row->private)) {
                return ['key_id' => $row->public, 'key_secret' => $row->private];
            }
        }

        return ['key_id' => null, 'key_secret' => null];
    }

    public function createOrder(Request $r, OrderService $orders)
    {
        $d = $r->validate([
            'items' => 'required|array|min:1',
            'items.*.product_code' => 'required|string|max:32|exists:products,product_code',
            'items.*.qty' => 'required|integer|min:1|max:9',
            'items.*.color' => 'nullable|string|max:60',
            'items.*.size' => 'nullable|string|max:60',
            'delivery' => 'required|string|max:100',
            'address' => 'nullable|string|max:2000',
            'coupon_code' => 'nullable|string|max:64',
        ]);

        $creds = $this->razorpayCredentials();
        if (empty($creds['key_id']) || empty($creds['key_secret'])) {
            abort(503, 'Razorpay is not configured.');
        }

        $order = $orders->create($r->user(), $d, [
            'status' => 'Pending Payment',
            'payment_status' => 'pending',
            'payment_provider' => 'razorpay',
            'stock_reason' => 'payment_reserved',
            'stock_reserved_until' => now()->addMinutes(15),
            'clear_cart' => false,
        ]);
        $amountPaise = (int) round(((float) $order->total) * 100);
        if ($amountPaise < 100) {
            $orders->releasePaymentReservation($order);
            abort(422, 'The order total is below the minimum Razorpay amount.');
        }

        try {
            $res = Http::connectTimeout(3)
                ->timeout(10)
                ->withBasicAuth($creds['key_id'], $creds['key_secret'])
                ->post('https://api.razorpay.com/v1/orders', [
                    'amount' => $amountPaise,
                    'currency' => 'INR',
                    'receipt' => $order->order_code,
                    'payment_capture' => 1,
                ]);
        } catch (\Throwable $e) {
            $orders->releasePaymentReservation($order);
            throw $e;
        }

        $razorpayOrder = $res->json();
        if (! $res->successful()
            || empty($razorpayOrder['id'])
            || (int) ($razorpayOrder['amount'] ?? 0) !== $amountPaise
            || strtoupper((string) ($razorpayOrder['currency'] ?? '')) !== 'INR') {
            $orders->releasePaymentReservation($order);
            abort(502, 'Unable to create Razorpay order.');
        }

        $order->update(['provider_order_id' => $razorpayOrder['id']]);

        return response()->json([
            'key_id' => $creds['key_id'],
            'razorpay_order_id' => $razorpayOrder['id'],
            'amount' => $amountPaise,
            'currency' => 'INR',
            'order_code' => $order->order_code,
        ], 201);
    }

    public function verify(Request $r, OrderService $orders)
    {
        $d = $r->validate([
            'razorpay_order_id' => 'required|string|max:64',
            'razorpay_payment_id' => 'required|string|max:64',
            'razorpay_signature' => 'required|string|max:256',
        ]);

        $u = $r->user();
        $order = Order::where('user_id', $u->id)
            ->where('provider_order_id', $d['razorpay_order_id'])
            ->firstOrFail();

        if ($order->payment_status === 'paid') {
            if ($order->payment_ref !== $d['razorpay_payment_id']) {
                abort(409, 'This payment order was already confirmed with a different payment.');
            }

            return response()->json($order, 200);
        }
        if ($order->payment_status !== 'pending' || $order->stock_released_at !== null) {
            abort(422, 'This payment attempt is no longer active.');
        }

        $creds = $this->razorpayCredentials();
        if (empty($creds['key_secret'])) {
            abort(503, 'Razorpay is not configured.');
        }

        $expected = hash_hmac('sha256', $d['razorpay_order_id'].'|'.$d['razorpay_payment_id'], $creds['key_secret']);
        if (! hash_equals($expected, $d['razorpay_signature'])) {
            abort(422, 'Invalid payment signature.');
        }

        $paymentResponse = Http::connectTimeout(3)
            ->timeout(10)
            ->withBasicAuth($creds['key_id'], $creds['key_secret'])
            ->get('https://api.razorpay.com/v1/payments/'.rawurlencode($d['razorpay_payment_id']));
        if (! $paymentResponse->successful()) {
            abort(502, 'Unable to confirm Razorpay payment status.');
        }
        $payment = $paymentResponse->json();
        if (($payment['status'] ?? null) !== 'captured'
            || ($payment['order_id'] ?? null) !== $d['razorpay_order_id']
            || (int) ($payment['amount'] ?? 0) !== (int) round(((float) $order->total) * 100)
            || strtoupper((string) ($payment['currency'] ?? '')) !== 'INR') {
            abort(422, 'Razorpay payment is not captured for the expected amount.');
        }

        $order = $orders->confirmPayment($order, $d['razorpay_payment_id']);

        return response()->json($order, 201);
    }

    public function cancel(Request $r, OrderService $orders)
    {
        $d = $r->validate(['razorpay_order_id' => 'required|string|max:64']);
        $order = Order::where('user_id', $r->user()->id)
            ->where('provider_order_id', $d['razorpay_order_id'])
            ->firstOrFail();

        return response()->json($orders->releasePaymentReservation($order));
    }
}
