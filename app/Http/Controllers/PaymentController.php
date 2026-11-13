<?php

namespace App\Http\Controllers;

use App\Models\Credential;
use App\Models\Order;
use App\Models\Product;
use App\Models\Vendor;
use App\Models\School;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Throwable;

class PaymentController extends Controller
{
    protected OrderService $orders;

    public function __construct(OrderService $orders)
    {
        $this->orders = $orders;
    }

    /**
     * Get active Razorpay credentials from database.
     */
    protected function razorpayCredentials(): array
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

    /**
     * Create Razorpay HTTP client with environment-specific SSL verification.
     *
     * Windows/XAMPP: Uses project CA bundle.
     * Linux hosting: Uses system CA certificates.
     */
    protected function razorpayHttp(array $creds)
    {
        if (PHP_OS_FAMILY === 'Windows') {
            $caBundle = base_path('storage/app/certificates/cacert.pem');

            if (!file_exists($caBundle) || !is_readable($caBundle)) {
                throw new \RuntimeException(
                    'Razorpay CA certificate not found or not readable: ' . $caBundle .
                    ' — download from https://curl.se/docs/caextract.html and place at storage/app/certificates/cacert.pem'
                );
            }

            $verify = $caBundle;
        } else {
            // Linux production server: use system CA certificates.
            $verify = true;
        }

        return Http::connectTimeout(10)
            ->timeout(30)
            ->withBasicAuth($creds['key_id'], $creds['key_secret'])
            ->withOptions([
                'verify' => $verify,
            ]);
    }

    /**
     * Create Razorpay order with payment split (Route API).
     *
     * Split logic:
     *   - For each cart item: look up the vendor OR school that owns the product
     *   - Vendor/School receives: item_subtotal × (1 - portal_charge_percent)
     *   - Platform (you) receives: portal_charge + delivery_charge + gst
     *
     * Razorpay requires each linked account to be active before transfer.
     * Items without a linked account go 100% to the platform.
     */
    public function createOrder(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_code' => ['required', 'string'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:9'],
            'items.*.color' => ['nullable', 'string'],
            'items.*.size' => ['nullable', 'string'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'mrp_total' => ['nullable', 'numeric', 'min:0'],
            'coupon_discount' => ['nullable', 'numeric', 'min:0'],
            'total_payable' => ['required', 'numeric', 'min:0.01'],
            'delivery' => ['required'],
            'address' => ['required'],
            'coupon_code' => ['nullable', 'string'],
            'pay_mode' => ['nullable', 'string'],
        ]);

        $order = null;

        try {
            // Create the order and reserve stock
            $order = $this->orders->create($user, $validated);

            $amount = (int) round(((float) $order->total) * 100);

            if ($amount < 100) {
                $this->orders->releasePaymentReservation($order);

                return response()->json([
                    'status' => false,
                    'message' => 'Order amount must be at least ₹1.',
                ], 422);
            }

            $creds = $this->razorpayCredentials();

            // Build the payment split (transfers array) using Route API
            $transfers = $this->buildTransfers($order);

            $payload = [
                'amount' => $amount,
                'currency' => 'INR',
                'receipt' => (string) $order->order_code,
                'transfers' => $transfers,
                'notes' => [
                    'order_code' => (string) $order->order_code,
                    'user_id' => (string) $user->id,
                ],
            ];

            try {
                $response = $this->razorpayHttp($creds)
                    ->post('https://api.razorpay.com/v1/orders', $payload);
            } catch (Throwable $e) {
                $this->orders->releasePaymentReservation($order);

                Log::error('Razorpay order API connection failed', [
                    'order_code' => $order->order_code,
                    'error' => $e->getMessage(),
                ]);

                return response()->json([
                    'status' => false,
                    'message' => 'Unable to connect to the payment gateway. Please try again.',
                ], 502);
            }

            $razorpayOrder = $response->json();

            if (!$response->successful() || empty($razorpayOrder['id'])) {
                $this->orders->releasePaymentReservation($order);

                Log::error('Razorpay order creation failed', [
                    'order_code' => $order->order_code,
                    'http_status' => $response->status(),
                    'response' => $razorpayOrder,
                ]);

                return response()->json([
                    'status' => false,
                    'message' => 'Unable to create payment order. Please try again.',
                ], 502);
            }

            $order->provider_order_id = $razorpayOrder['id'];
            $order->save();

            return response()->json([
                'status' => true,
                'message' => 'Payment order created successfully.',
                'key_id' => $creds['key_id'],
                'razorpay_order_id' => $razorpayOrder['id'],
                'amount' => $amount,
                'currency' => 'INR',
                'order_code' => $order->order_code,
                'transfers' => $transfers,
            ]);

        } catch (ValidationException $e) {
            throw $e;

        } catch (Throwable $e) {
            if ($order) {
                try {
                    $this->orders->releasePaymentReservation($order);
                } catch (Throwable $releaseError) {
                    Log::error('Failed to release order reservation', [
                        'order_code' => $order->order_code ?? null,
                        'error' => $releaseError->getMessage(),
                    ]);
                }
            }

            Log::error('Razorpay createOrder error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Unable to initialize payment. Please try again.',
            ], 500);
        }
    }

    /**
     * Build the Razorpay transfers array for payment splitting (Route API).
     *
     * Each cart item is routed to either:
     *   - The vendor's linked account (if vendor has razorpay_account_id + active)
     *   - The school's linked account (if school has razorpay_account_id + active)
     *   - Platform (fallback — items with no linked account)
     *
     * Platform also receives: portal charges + delivery + GST.
     */
    protected function buildTransfers(Order $order): array
    {
        $transfers = [];
        $items = is_string($order->items) ? json_decode($order->items, true) : $order->items;
        if (!is_array($items)) {
            $items = [];
        }

        // Group cart items by their owner (vendor or school linked account)
        $ownerSplits = [];   // ['acc_XXX' => amount_in_paise]
        $platformShare = 0;  // in paise

        foreach ($items as $item) {
            $product = Product::where('product_code', $item['product_code'])->first();
            if (!$product) {
                continue;
            }

            $itemSubtotal = (int) round(((float) $product->price) * 100 * ($item['qty'] ?? 1));

            // Look up the linked account (vendor or school)
            $linkedAccountId = null;
            if (!empty($product->vendor_id)) {
                $vendor = Vendor::find($product->vendor_id);
                if (!empty($vendor->razorpay_active) && !empty($vendor->razorpay_account_id)) {
                    $linkedAccountId = $vendor->razorpay_account_id;
                }
            } elseif (!empty($product->school_id)) {
                $school = School::find($product->school_id);
                if (!empty($school->razorpay_active) && !empty($school->razorpay_account_id)) {
                    $linkedAccountId = $school->razorpay_account_id;
                }
            }

            // Compute the vendor/school share (item subtotal minus portal charge)
            $portalPercent = (float) ($product->portal_charge ?? 0) / 100;
            $portalAmount = (int) round($itemSubtotal * $portalPercent);
            $ownerAmount = $itemSubtotal - $portalAmount;

            if ($linkedAccountId) {
                $ownerSplits[$linkedAccountId] = ($ownerSplits[$linkedAccountId] ?? 0) + $ownerAmount;
            } else {
                // No linked account — full item amount goes to platform
                $platformShare += $itemSubtotal;
            }

            // Portal charge always goes to platform
            $platformShare += $portalAmount;
        }

        // Add delivery charge + GST to platform share
        $platformShare += (int) round(((float) $order->delivery_charge) * 100);
        $platformShare += (int) round(((float) $order->gst_amount) * 100);

        // Build the transfers array — vendor/school splits first
        foreach ($ownerSplits as $accountId => $amount) {
            if ($amount > 0) {
                $transfers[] = [
                    'account' => $accountId,
                    'amount' => $amount,
                    'currency' => 'INR',
                    'notes' => [
                        'order_code' => (string) $order->order_code,
                        'reason' => 'vendor/school share',
                    ],
                    'linked_account_notes' => ['order_code'],
                ];
            }
        }

        // Platform transfer — if a platform_account_id is configured.
        // If empty, Razorpay holds the remainder in the parent account automatically.
        $platformAccountId = config('services.razorpay.platform_account_id');
        if ($platformShare > 0 && !empty($platformAccountId)) {
            $transfers[] = [
                'account' => $platformAccountId,
                'amount' => $platformShare,
                'currency' => 'INR',
                'notes' => [
                    'order_code' => (string) $order->order_code,
                    'reason' => 'platform share',
                ],
                'linked_account_notes' => ['order_code'],
            ];
        }

        return $transfers;
    }

    /**
     * Verify Razorpay payment signature and payment status.
     */
    public function verify(Request $request)
    {
        $validated = $request->validate([
            'razorpay_order_id' => ['required', 'string'],
            'razorpay_payment_id' => ['required', 'string'],
            'razorpay_signature' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $order = Order::query()
            ->where('user_id', $user->id)
            ->where('provider_order_id', $validated['razorpay_order_id'])
            ->first();

        if (!$order) {
            return response()->json([
                'status' => false,
                'message' => 'Order not found.',
            ], 404);
        }

        try {
            $creds = $this->razorpayCredentials();

            $generatedSignature = hash_hmac(
                'sha256',
                $validated['razorpay_order_id'] . '|' . $validated['razorpay_payment_id'],
                $creds['key_secret']
            );

            if (!hash_equals($generatedSignature, $validated['razorpay_signature'])) {
                return response()->json([
                    'status' => false,
                    'message' => 'Invalid payment signature.',
                ], 422);
            }

            // Fetch payment details directly from Razorpay
            $response = $this->razorpayHttp($creds)
                ->get(
                    'https://api.razorpay.com/v1/payments/' .
                    $validated['razorpay_payment_id']
                );

            if (!$response->successful()) {
                Log::error('Razorpay payment fetch failed', [
                    'order_code' => $order->order_code,
                    'http_status' => $response->status(),
                    'response' => $response->json(),
                ]);

                return response()->json([
                    'status' => false,
                    'message' => 'Unable to verify payment with Razorpay.',
                ], 502);
            }

            $payment = $response->json();

            // Confirm payment is captured
            if (($payment['status'] ?? null) !== 'captured') {
                return response()->json([
                    'status' => false,
                    'message' => 'Payment has not been captured.',
                ], 422);
            }

            // Verify payment belongs to the expected Razorpay order
            if (
                ($payment['order_id'] ?? null) !==
                $validated['razorpay_order_id']
            ) {
                return response()->json([
                    'status' => false,
                    'message' => 'Payment order ID mismatch.',
                ], 422);
            }

            // Verify amount
            $expectedAmount = (int) round(
                    ((float) $order->total) * 100
                );

            if ((int) ($payment['amount'] ?? 0) !== $expectedAmount) {
                return response()->json([
                    'status' => false,
                    'message' => 'Payment amount mismatch.',
                ], 422);
            }

            // Verify currency
            if (($payment['currency'] ?? null) !== 'INR') {
                return response()->json([
                    'status' => false,
                    'message' => 'Payment currency mismatch.',
                ], 422);
            }

            // Confirm payment and finalize order
            $this->orders->confirmPayment($order, $validated['razorpay_payment_id']);

            return response()->json([
                'status' => true,
                'message' => 'Payment verified successfully.',
                'order_code' => $order->order_code,
                'payment_id' => $validated['razorpay_payment_id'],
            ]);

        } catch (Throwable $e) {
            Log::error('Razorpay payment verification error', [
                'order_code' => $order->order_code,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Unable to verify payment. Please contact support if money was deducted.',
            ], 500);
        }
    }

    /**
     * Cancel payment and release the stock reservation.
     */
    public function cancel(Request $request)
    {
        $validated = $request->validate([
            'razorpay_order_id' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $order = Order::query()
            ->where('user_id', $user->id)
            ->where('provider_order_id', $validated['razorpay_order_id'])
            ->first();

        if (!$order) {
            return response()->json([
                'status' => false,
                'message' => 'Order not found.',
            ], 404);
        }

        try {
            $this->orders->releasePaymentReservation($order);

            return response()->json([
                'status' => true,
                'message' => 'Payment cancelled successfully.',
            ]);

        } catch (Throwable $e) {
            Log::error('Razorpay payment cancellation error', [
                'order_code' => $order->order_code,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Unable to cancel payment.',
            ], 500);
        }
    }
}