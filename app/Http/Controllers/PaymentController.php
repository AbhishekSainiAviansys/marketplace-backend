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
            if ($row && !empty($row->public) && !empty($row->private)) {
                return ['key_id' => $row->public, 'key_secret' => $row->private];
            }
        }
        return ['key_id' => null, 'key_secret' => null];
    }

    public function createOrder(Request $r)
    {
        $d = $r->validate([
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'nullable|string|size:3',
            'receipt' => 'nullable|string|max:64',
        ]);

        $creds = $this->razorpayCredentials();
        if (empty($creds['key_id']) || empty($creds['key_secret'])) {
            abort(503, 'Razorpay is not configured.');
        }

        $amountPaise = (int) round(((float) $d['amount']) * 100);
        $res = Http::withBasicAuth($creds['key_id'], $creds['key_secret'])
            ->post('https://api.razorpay.com/v1/orders', [
                'amount' => $amountPaise,
                'currency' => strtoupper($d['currency'] ?? 'INR'),
                'receipt' => $d['receipt'] ?? ('rcpt_' . now()->timestamp),
                'payment_capture' => 1,
            ]);

        if (!$res->successful()) {
            abort(502, 'Unable to create Razorpay order.');
        }

        $rz = $res->json();
        return response()->json([
            'key_id' => $creds['key_id'],
            'razorpay_order_id' => $rz['id'],
            'amount' => $rz['amount'],
            'currency' => $rz['currency'],
        ]);
    }

    public function verify(Request $r, OrderService $orders)
    {
        $d = $r->validate([
            'razorpay_order_id' => 'required|string|max:64',
            'razorpay_payment_id' => 'required|string|max:64',
            'razorpay_signature' => 'required|string|max:256',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|integer|exists:products,id',
            'items.*.qty' => 'nullable|integer|min:1',
            'total' => 'required|numeric|min:0',
            'pay_mode' => 'nullable|string|max:50',
            'delivery' => 'nullable|string|max:100',
            'address' => 'nullable|string',
        ]);

        $u = $r->user();

        // Idempotency: already created for this Razorpay order.
        $existing = Order::where('user_id', $u->id)
            ->where('provider_order_id', $d['razorpay_order_id'])
            ->first();
        if ($existing) {
            return response()->json($existing, 200);
        }

        $creds = $this->razorpayCredentials();
        if (empty($creds['key_secret'])) {
            abort(503, 'Razorpay is not configured.');
        }

        $expected = hash_hmac('sha256', $d['razorpay_order_id'] . '|' . $d['razorpay_payment_id'], $creds['key_secret']);
        if (!hash_equals($expected, $d['razorpay_signature'])) {
            abort(422, 'Invalid payment signature.');
        }

        $order = $orders->create($u, $d, [
            'status' => 'Placed',
            'payment_status' => 'paid',
            'payment_provider' => 'razorpay',
            'provider_order_id' => $d['razorpay_order_id'],
            'payment_ref' => $d['razorpay_payment_id'],
            'paid_at' => now(),
        ]);

        return response()->json($order, 201);
    }
}
