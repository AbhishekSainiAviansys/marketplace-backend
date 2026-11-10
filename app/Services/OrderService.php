<?php

namespace App\Services;

use App\Http\Controllers\NotificationController;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class OrderService
{
    private function findProduct($key, bool $lock = false): ?Product
    {
        if ($key === null || $key === '') {
            return null;
        }
        $q = Product::query();
        if ($lock) {
            $q->lockForUpdate();
        }
        if (is_numeric($key)) {
            return $q->find($key);
        }

        return $q->where('product_code', (string) $key)->first();
    }

    private function customerUnitPrice(Product $product): float
    {
        return round(
            (float) $product->price + (float) ($product->portal_charge ?? 0) + (float) ($product->server_charge ?? 0),
            2,
        );
    }

    /**
     * Create an order transactionally: validate + decrement stock, persist the
     * order (with optional payment metadata), and clear the user's cart.
     *
     * @param  array  $data  Validated order payload (items, total, pay_mode, ...)
     * @param  array  $payment  Optional payment metadata:
     *                          payment_status, payment_provider, provider_order_id, payment_ref, paid_at, status
     */
    public function create(User $u, array $data, array $payment = []): Order
    {
        $notifyAdmin = false;
        $adminProductNames = [];

        $order = DB::transaction(function () use (
            $u,
            $data,
            $payment,
            &$notifyAdmin,
            &$adminProductNames
        ) {
            /*
            |--------------------------------------------------------------------------
            | 1. Normalize product items
            |--------------------------------------------------------------------------
            */

            $normalized = [];

            foreach ($data['items'] as $it) {
                $key = $it['product_code']
                    ?? $it['product_id']
                    ?? $it['id']
                    ?? null;

                $product = $this->findProduct($key);

                if ($product) {
                    $it['product_code'] = $product->product_code;
                    $it['name'] = $product->name;
                    $it['price'] = $this->customerUnitPrice($product);
                } elseif ($key !== null && empty($it['product_code'])) {
                    $it['product_code'] = (string) $key;
                }

                unset($it['id'], $it['product_id']);

                $normalized[] = $it;
            }

            $data['items'] = $normalized;

            /*
            |--------------------------------------------------------------------------
            | 2. Validate products and reserve/decrement stock
            |--------------------------------------------------------------------------
            */

            foreach ($data['items'] as $it) {
                if (empty($it['product_code'])) {
                    abort(422, 'Invalid product in your cart.');
                }

                $product = $this->findProduct($it['product_code'], true);

                if (!$product || !$product->is_active) {
                    abort(422, 'A product in your cart is no longer available.');
                }

                $qty = (int) ($it['qty'] ?? 1);

                if ($qty < 1 || $qty > 9) {
                    abort(422, 'Invalid product quantity.');
                }

                $inventory = app(ProductStockService::class);

                $color = isset($it['color'])
                    ? (string) $it['color']
                    : null;

                $size = isset($it['size'])
                    ? (string) $it['size']
                    : null;

                $hasVariants = $inventory->hasVariants($product);

                if ($hasVariants && ($color === null || $size === null)) {
                    abort(422, 'Choose a colour and size for ' . $product->name . '.');
                }

                $stockRecord = $inventory->findStockRecord(
                    $product,
                    $color,
                    $size,
                    true
                );

                $inventory->decrementForOrder(
                    $product,
                    $stockRecord,
                    $qty,
                    $color,
                    $size,
                    $hasVariants,
                    (string) ($payment['stock_reason'] ?? 'ordered')
                );

                if (
                    $product->created_by_type === 'admin' ||
                    $product->added_by_role === 'admin'
                ) {
                    $notifyAdmin = true;
                    $adminProductNames[] = $product->name;
                }
            }

            /*
            |--------------------------------------------------------------------------
            | 3. Generate order code
            |--------------------------------------------------------------------------
            */

            $code = 'ORD' .
                now()->format('ymd') .
                str_pad(
                    (string) random_int(0, 9999),
                    4,
                    '0',
                    STR_PAD_LEFT
                );

            /*
            |--------------------------------------------------------------------------
            | 4. Calculate subtotal using database product prices
            |--------------------------------------------------------------------------
            */

            $subtotal = 0.0;

            foreach ($data['items'] as $it) {
                $qty = max(1, (int) ($it['qty'] ?? 1));

                $price = (float) ($it['price'] ?? 0);

                if (empty($it['price']) && !empty($it['product_code'])) {
                    $product = $this->findProduct($it['product_code']);

                    if ($product) {
                        $price = $this->customerUnitPrice($product);
                    }
                }

                $subtotal += $qty * $price;
            }

            $subtotal = round($subtotal, 2);

            /*
            |--------------------------------------------------------------------------
            | 5. Calculate delivery charge
            |--------------------------------------------------------------------------
            */

            $deliveryText = (string) ($data['delivery'] ?? '');

            $isPickup = stripos($deliveryText, 'pickup') !== false;

            $delivery = 0.0;
            $productDelivery = 0.0;
            $hasExplicitDelivery = false;

            foreach ($data['items'] as $it) {
                if (empty($it['product_code'])) {
                    continue;
                }

                $product = $this->findProduct($it['product_code']);

                if ($product && $product->delivery_charge !== null) {
                    $hasExplicitDelivery = true;

                    $productDelivery +=
                        (float) $product->delivery_charge *
                        max(1, (int) ($it['qty'] ?? 1));
                }
            }

            if ($hasExplicitDelivery) {
                $delivery = $productDelivery;
            } elseif (!$isPickup) {
                $delivery = $subtotal >= 999 ? 0.0 : 49.0;
            }

            $delivery = round($delivery, 2);

            /*
            |--------------------------------------------------------------------------
            | 6. Calculate GST
            |--------------------------------------------------------------------------
            */

            $gstRate = 18.0;

            $gst = round(
                ($subtotal + $delivery) * ($gstRate / 100),
                2
            );

            /*
            |--------------------------------------------------------------------------
            | 7. Validate coupon and calculate discount
            |--------------------------------------------------------------------------
            */

            $couponCode = !empty($data['coupon_code'])
                ? strtoupper(trim((string) $data['coupon_code']))
                : null;

            $coupon = null;
            $couponDiscount = 0.0;

            if ($couponCode) {
                $res = (new CouponService)->validateCode(
                    $couponCode,
                    $u,
                    $subtotal
                );

                $coupon = $res['coupon'];
                $couponDiscount = (float) $res['discount_amount'];
            }

            $couponDiscount = round($couponDiscount, 2);

            /*
            |--------------------------------------------------------------------------
            | 8. Calculate final payable amount
            |--------------------------------------------------------------------------
            */

            $grandTotal = round(
                $subtotal + $delivery + $gst - $couponDiscount,
                2
            );

            $grandTotal = max(0, $grandTotal);

            /*
            |--------------------------------------------------------------------------
            | 9. Verify frontend payable amount
            |--------------------------------------------------------------------------
            |
            | Never use the frontend amount to calculate the order.
            | Only compare it with our database-calculated amount.
            |
            */

            if (array_key_exists('total_payable', $data)) {
                $clientPayable = round(
                    (float) $data['total_payable'],
                    2
                );

                if (abs($grandTotal - $clientPayable) > 0.01) {
                    abort(
                        422,
                        'Order amount has changed. Please refresh your cart and try again.'
                    );
                }
            }

            /*
            |--------------------------------------------------------------------------
            | 10. Create order payload
            |--------------------------------------------------------------------------
            */

            $payload = array_merge([
                'user_id' => $u->id,
                'order_code' => $code,
                'items' => $data['items'],

                // Final amount payable by customer.
                'total' => $grandTotal,

                'pay_mode' => $data['pay_mode'] ?? 'Online',
                'delivery' => $data['delivery'] ?? null,
                'address' => $data['address'] ?? null,

                'status' => $data['status'] ?? 'Placed',

                'placed_at' =>
                    ($payment['payment_status'] ?? null) === 'pending'
                        ? null
                        : now(),

                'payment_status' => $payment['payment_status'] ?? 'paid',

                'paid_at' =>
                    ($payment['payment_status'] ?? 'paid') === 'paid'
                        ? now()
                        : null,

            ], array_intersect_key(
                $payment,
                array_flip([
                    'status',
                    'payment_status',
                    'payment_provider',
                    'provider_order_id',
                    'payment_ref',
                    'paid_at',
                    'stock_reserved_until',
                ])
            ));

            /*
            |--------------------------------------------------------------------------
            | 11. Save price breakdown if columns exist
            |--------------------------------------------------------------------------
            */

            if (Schema::hasColumn('orders', 'subtotal')) {
                $payload['subtotal'] = $subtotal;
            }

            if (Schema::hasColumn('orders', 'delivery_charge')) {
                $payload['delivery_charge'] = $delivery;
            }

            if (Schema::hasColumn('orders', 'gst_rate')) {
                $payload['gst_rate'] = $gstRate;
            }

            if (Schema::hasColumn('orders', 'gst_amount')) {
                $payload['gst_amount'] = $gst;
            }

            if (
                $couponCode &&
                Schema::hasColumn('orders', 'coupon_code')
            ) {
                $payload['coupon_code'] = $couponCode;
            }

            if (Schema::hasColumn('orders', 'coupon_discount')) {
                $payload['coupon_discount'] = $couponDiscount;
            }

            if ($coupon && Schema::hasColumn('orders', 'coupon_id')) {
                $payload['coupon_id'] = $coupon->id;
            }

            /*
            |--------------------------------------------------------------------------
            | 12. Create order
            |--------------------------------------------------------------------------
            */

            $order = Order::create($payload);

            /*
            |--------------------------------------------------------------------------
            | 13. Save coupon usage
            |--------------------------------------------------------------------------
            */

            if ($coupon) {
                $coupon->increment('used_count');

                CouponUsage::create([
                    'coupon_id' => $coupon->id,
                    'user_id' => $u->id,
                    'order_id' => $order->id,
                    'used_at' => now(),
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | 14. Clear cart if requested
            |--------------------------------------------------------------------------
            */

            if ($payment['clear_cart'] ?? true) {
                $cart = Cart::where('user_id', $u->id)->first();

                if ($cart) {
                    $cart->items()->delete();
                }
            }

            return $order;
        });

        /*
        |--------------------------------------------------------------------------
        | 15. Notify admin
        |--------------------------------------------------------------------------
        */

        if (
            $notifyAdmin &&
            (($payment['payment_status'] ?? 'unpaid') === 'paid')
        ) {
            $this->notifyAdminAboutOrder($order, $adminProductNames);
        }

        return $order;
    }

    public function confirmPayment(Order $order, string $paymentId): Order
    {
        $confirmedNow = false;
        $result = DB::transaction(function () use ($order, $paymentId, &$confirmedNow) {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);
            if ($locked->payment_status === 'paid') {
                if ($locked->payment_ref !== $paymentId) {
                    abort(409, 'This payment order was already confirmed with a different payment.');
                }

                return ['order' => $locked, 'expired' => false];
            }
            if ($locked->payment_status !== 'pending' || $locked->stock_released_at !== null) {
                abort(422, 'This payment attempt is no longer active.');
            }
            if ($locked->stock_reserved_until && $locked->stock_reserved_until->isPast()) {
                $this->releaseReservationLocked($locked, 'expired');

                return ['order' => $locked->fresh(), 'expired' => true];
            }

            $locked->update([
                'status' => 'Placed',
                'payment_status' => 'paid',
                'payment_ref' => $paymentId,
                'paid_at' => now(),
                'placed_at' => now(),
            ]);
            $cart = Cart::where('user_id', $locked->user_id)->first();
            if ($cart) {
                $cart->items()->delete();
            }
            $confirmedNow = true;

            return ['order' => $locked->fresh(), 'expired' => false];
        });

        if ($result['expired']) {
            abort(422, 'The stock reservation expired before payment was confirmed.');
        }
        if ($confirmedNow) {
            $this->notifyAdminAboutOrder($result['order'], []);
        }

        return $result['order'];
    }

    public function releasePaymentReservation(Order $order, string $status = 'failed'): Order
    {
        return DB::transaction(function () use ($order, $status) {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);
            if ($locked->payment_status !== 'pending' || $locked->stock_released_at !== null) {
                return $locked;
            }

            return $this->releaseReservationLocked($locked, $status);
        });
    }

    public function expirePaymentReservations(): int
    {
        $expiredCount = 0;
        Order::query()
            ->where('payment_status', 'pending')
            ->whereNotNull('stock_reserved_until')
            ->where('stock_reserved_until', '<=', now())
            ->orderBy('id')
            ->chunkById(100, function ($orders) use (&$expiredCount): void {
                foreach ($orders as $order) {
                    $expired = $this->releasePaymentReservation($order, 'expired');
                    if ($expired->payment_status === 'expired') {
                        $expiredCount++;
                    }
                }
            });

        return $expiredCount;
    }

    private function releaseReservationLocked(Order $order, string $status): Order
    {
        $paymentStatus = in_array($status, ['failed', 'expired'], true) ? $status : 'failed';
        $inventory = app(ProductStockService::class);
        foreach ($order->items ?? [] as $item) {
            $product = $this->findProduct($item['product_code'] ?? null, true);
            if (! $product) {
                continue;
            }
            $inventory->restoreReservation(
                $product,
                (int) ($item['qty'] ?? 1),
                isset($item['color']) ? (string) $item['color'] : null,
                isset($item['size']) ? (string) $item['size'] : null,
            );
        }

        if ($order->coupon_id && Schema::hasTable('coupons')) {
            $coupon = Coupon::query()->lockForUpdate()->find($order->coupon_id);
            if ($coupon && $coupon->used_count > 0) {
                $coupon->decrement('used_count');
            }
            CouponUsage::where('order_id', $order->id)->delete();
        }

        $order->update([
            'payment_status' => $paymentStatus,
            'status' => $paymentStatus === 'expired' ? 'Payment Expired' : 'Payment Failed',
            'stock_released_at' => now(),
        ]);

        return $order->fresh();
    }

    private function notifyAdminAboutOrder(Order $order, array $adminProductNames): void
    {
        if ($adminProductNames === []) {
            $codes = collect($order->items ?? [])->pluck('product_code')->filter()->unique();
            $adminProductNames = Product::query()
                ->whereIn('product_code', $codes)
                ->where(function ($query) {
                    $query->where('created_by_type', 'admin')->orWhere('added_by_role', 'admin');
                })
                ->pluck('name')
                ->all();
        }
        if ($adminProductNames === []) {
            return;
        }

        $title = 'New order for admin product';
        $body = 'Order '.$order->order_code.' includes: '.implode(', ', array_values(array_unique($adminProductNames)));
        $admins = User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            try {
                NotificationController::push($admin->id, $title, $body, 'order');
            } catch (\Throwable $e) {
                Log::warning('Admin notification failed: '.$e->getMessage());
            }
            try {
                app(FcmService::class)->sendToUser($admin, $title, $body, [
                    'order_id' => $order->id,
                    'order_code' => $order->order_code,
                ]);
            } catch (\Throwable $e) {
                Log::warning('FCM notification failed: '.$e->getMessage());
            }
        }
    }
}
