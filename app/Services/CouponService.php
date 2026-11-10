<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\User;

class CouponService
{
    public function validateCode(
        string $code,
        ?User $user = null,
        float $subtotal = 0
    ): array {

        $code = strtoupper(trim($code));

        $coupon = Coupon::where('code', $code)->first();

        if (!$coupon) {
            abort(422, 'Invalid coupon code.');
        }

        $error = $coupon->validationError($user, $subtotal);

        if ($error !== null) {
            abort(422, $error);
        }

        $discount = $coupon->discountFor($subtotal);

        return [
            'coupon' => $coupon,
            'discount_amount' => $discount,
        ];
    }
}
