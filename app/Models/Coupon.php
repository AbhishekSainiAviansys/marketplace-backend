<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\User;
use App\Models\Order;

class Coupon extends Model
{
    protected $fillable = [
        'code',
        'title',
        'description',
        'type',
        'discount_type',
        'discount_value',
        'max_discount',
        'min_order_amount',
        'usage_limit',
        'used_count',
        'per_user_limit',
        'starts_at',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'usage_limit' => 'integer',
        'used_count' => 'integer',
        'per_user_limit' => 'integer',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function usages(): HasMany
    {
        return $this->hasMany(CouponUsage::class);
    }

    /**
     * Get the exact coupon validation error.
     */
    public function validationError(
        ?User $user = null,
        float $subtotal = 0
    ): ?string {

        if (!$this->is_active) {
            return 'This coupon is currently inactive.';
        }

        $now = now();

        if ($this->starts_at && $now->lt($this->starts_at)) {
            return 'This coupon is not active yet.';
        }

        if ($this->expires_at && $now->gt($this->expires_at)) {
            return 'This coupon has expired.';
        }

        if (
            $this->usage_limit !== null &&
            $this->used_count >= $this->usage_limit
        ) {
            return 'This coupon usage limit has been reached.';
        }

        if (
            $this->min_order_amount !== null &&
            $subtotal < (float) $this->min_order_amount
        ) {
            $remainingAmount = max(0, (float) $this->min_order_amount - $subtotal);

            return 'Add items worth ₹' . number_format($remainingAmount, 2) .
                ' more to avail this discount. Minimum order subtotal is ₹' .
                number_format((float) $this->min_order_amount, 2) . '.';
        }

        if ($user) {

            $usedByUser = $this->usages()
                ->where('user_id', $user->id)
                ->count();

            // Zero or null means unlimited.
            if (
                $this->per_user_limit !== null &&
                $this->per_user_limit > 0 &&
                $usedByUser >= $this->per_user_limit
            ) {
                return 'You have already used this coupon the maximum allowed number of times.';
            }

            if (
                $this->type === 'first_user' &&
                Order::where('user_id', $user->id)->exists()
            ) {
                return 'This coupon is only available for first-time customers.';
            }
        }

        return null;
    }

    public function isValidFor(
        ?User $user = null,
        float $subtotal = 0
    ): bool {
        return $this->validationError($user, $subtotal) === null;
    }

    public function discountFor(float $subtotal): float
    {
        if ($this->discount_type === 'percent') {

            $discount = $subtotal *
                ((float) $this->discount_value / 100);

            if ($this->max_discount !== null) {
                $discount = min(
                    $discount,
                    (float) $this->max_discount
                );
            }

        } else {

            $discount = (float) $this->discount_value;
        }

        $discount = min($discount, $subtotal);

        return round(max(0, $discount), 2);
    }
}
