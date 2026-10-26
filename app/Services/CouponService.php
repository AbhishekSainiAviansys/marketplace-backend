<?php
namespace App\Services;

use App\Models\Coupon;
use App\Models\User;

class CouponService
{
    public function validateCode(string $code, ?User $user = null, float $subtotal = 0): array
    {
        $code = strtoupper(trim($code));
        $coupon = Coupon::where('code', $code)->first();
        if (!$coupon) {
            abort(422, 'Invalid coupon code.');
        }
        if (!$coupon->isValidFor($user, $subtotal)) {
            abort(422, 'This coupon is not available for your order.');
        }
        $discount = $coupon->discountFor($subtotal);
        return [
            'coupon' => $coupon,
            'discount_amount' => $discount,
        ];
    }
}
