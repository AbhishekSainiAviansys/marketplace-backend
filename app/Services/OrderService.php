<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class OrderService
{
    /**
     * Create an order transactionally: validate + decrement stock, persist the
     * order (with optional payment metadata), and clear the user's cart.
     *
     * @param  array  $data  Validated order payload (items, total, pay_mode, ...)
     * @param  array  $payment  Optional payment metadata:
     *     payment_status, payment_provider, provider_order_id, payment_ref, paid_at, status
     */
    public function create(User $u, array $data, array $payment = []): Order
    {
        $notifyAdmin = false;
        $adminProductNames = [];

        $order = DB::transaction(function () use ($u, $data, $payment, &$notifyAdmin, &$adminProductNames) {
            foreach ($data['items'] as $it) {
                if (empty($it['id'])) continue;
                $product = Product::lockForUpdate()->find($it['id']);
                if (!$product || !$product->is_active) {
                    abort(422, 'A product in your cart is no longer available.');
                }
                $qty = (int) ($it['qty'] ?? 1);
                if ($product->stock < $qty) {
                    abort(422, 'Insufficient stock for '.$product->name.'. Only '.$product->stock.' left.');
                }
                $product->decrement('stock', $qty);

                if ($product->created_by_type === 'admin' || $product->added_by_role === 'admin') {
                    $notifyAdmin = true;
                    $adminProductNames[] = $product->name;
                }
            }

            $code = 'ORD'.now()->format('ymd').str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);

            $subtotal = 0.0;
            foreach ($data['items'] as $it) {
                $qty = max(1, (int) ($it['qty'] ?? 1));
                $price = (float) ($it['price'] ?? 0);
                if (empty($it['price']) && !empty($it['id'])) {
                    $product = Product::find($it['id']);
                    if ($product) $price = (float) $product->price;
                }
                $subtotal += $qty * $price;
            }

            $deliveryText = (string) ($data['delivery'] ?? '');
            $isPickup = stripos($deliveryText, 'pickup') !== false;
            $delivery = 0.0;
            if ($isPickup) {
                $productDelivery = 0.0;
                $hasExplicit = false;
                foreach ($data['items'] as $it) {
                    if (!empty($it['id'])) {
                        $product = Product::find($it['id']);
                        if ($product && $product->delivery_charge !== null) {
                            $hasExplicit = true;
                            $productDelivery += (float) $product->delivery_charge * max(1, (int) ($it['qty'] ?? 1));
                        }
                    }
                }
                if ($hasExplicit) {
                    $delivery = $productDelivery;
                } else {
                    $delivery = 0.0;
                }
            } else {
                $productDelivery = 0.0;
                $hasExplicit = false;
                foreach ($data['items'] as $it) {
                    if (!empty($it['id'])) {
                        $product = Product::find($it['id']);
                        if ($product && $product->delivery_charge !== null) {
                            $hasExplicit = true;
                            $productDelivery += (float) $product->delivery_charge * max(1, (int) ($it['qty'] ?? 1));
                        }
                    }
                }
                if ($hasExplicit) {
                    $delivery = $productDelivery;
                } else {
                    $delivery = $subtotal >= 999 ? 0.0 : 49.0;
                }
            }

            $gstRate = 18.0;
            $gst = round(($subtotal + $delivery) * ($gstRate / 100), 2);

            $couponCode = !empty($data['coupon_code']) ? strtoupper(trim((string) $data['coupon_code'])) : null;
            $coupon = null;
            $couponDiscount = 0.0;
            if ($couponCode) {
                $res = (new \App\Services\CouponService())->validateCode($couponCode, $u, $subtotal);
                $coupon = $res['coupon'];
                $couponDiscount = (float) $res['discount_amount'];
            }

            $grandTotal = round($subtotal + $delivery + $gst - $couponDiscount, 2);
            if ($grandTotal < 0) $grandTotal = 0;


            $payload = array_merge([
                'user_id' => $u->id,
                'order_code' => $code,
                'items' => $data['items'],
                'total' => $grandTotal,
                'pay_mode' => $data['pay_mode'] ?? 'Online',
                'delivery' => $data['delivery'] ?? null,
                'address' => $data['address'] ?? null,
                'status' => $data['status'] ?? 'Placed',
                'placed_at' => now(),
                'payment_status' => 'paid',
                'paid_at' => now(),
            ], array_intersect_key($payment, array_flip([
                'status','payment_status','payment_provider','provider_order_id','payment_ref','paid_at',
            ])));
            if (Schema::hasColumn('orders', 'subtotal')) $payload['subtotal'] = $subtotal;
            if (Schema::hasColumn('orders', 'delivery_charge')) $payload['delivery_charge'] = $delivery;
            if (Schema::hasColumn('orders', 'gst_rate')) $payload['gst_rate'] = $gstRate;
            if (Schema::hasColumn('orders', 'gst_amount')) $payload['gst_amount'] = $gst;
            if ($couponCode && Schema::hasColumn('orders', 'coupon_code')) $payload['coupon_code'] = $couponCode;
            if (Schema::hasColumn('orders', 'coupon_discount')) $payload['coupon_discount'] = $couponDiscount;
            if ($coupon && Schema::hasColumn('orders', 'coupon_id')) $payload['coupon_id'] = $coupon->id;

            $order = Order::create($payload);

            if ($coupon) {
                $coupon->increment('used_count');
                \App\Models\CouponUsage::create([
                    'coupon_id' => $coupon->id,
                    'user_id' => $u->id,
                    'order_id' => $order->id,
                    'used_at' => now(),
                ]);
            }

            $cart = Cart::where('user_id', $u->id)->first();
            if ($cart) $cart->items()->delete();

            return $order;
        });

        if ($notifyAdmin && (($payment['payment_status'] ?? 'unpaid') === 'paid')) {
            $title = 'New order for admin product';
            $body = 'Order '.$order->order_code.' includes: '.implode(', ', array_values(array_unique($adminProductNames)));
            $admins = User::where('role', 'admin')->get();
            foreach ($admins as $admin) {
                try {
                    \App\Http\Controllers\NotificationController::push($admin->id, $title, $body, 'order');
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Admin notification failed: '.$e->getMessage());
                }
                try {
                    app(\App\Services\FcmService::class)->sendToUser($admin, $title, $body, [
                        'order_id' => $order->id,
                        'order_code' => $order->order_code,
                    ]);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('FCM notification failed: '.$e->getMessage());
                }
            }
        }

        return $order;
    }
}
