<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Coupon extends Model
{
    protected $fillable = [
        'code', 'title', 'description', 'type', 'discount_type', 'discount_value',
        'max_discount', 'min_order_amount', 'usage_limit', 'used_count', 'per_user_limit',
        'starts_at', 'expires_at', 'is_active',
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

    public function isValidFor(?\App\Models\User $user = null, float $subtotal = 0): bool
    {
        if (!$this->is_active) return false;
        $now = now();
        if ($this->starts_at && $now->lt($this->starts_at)) return false;
        if ($this->expires_at && $now->gt($this->expires_at)) return false;
        if ($this->usage_limit !== null && (int) $this->used_count >= (int) $this->usage_limit) return false;
        if ($this->min_order_amount !== null && $subtotal < (float) $this->min_order_amount) return false;

        if ($user) {
            $usedByUser = $this->usages()->where('user_id', $user->id)->count();
            if ($usedByUser >= max(1, (int) $this->per_user_limit)) return false;
            if ($this->type === 'first_user' && \App\Models\Order::where('user_id', $user->id)->exists()) return false;
        }

        return true;
    }

    public function discountFor(float $subtotal): float
    {
        if ($this->discount_type === 'percent') {
            $discount = $subtotal * ((float) $this->discount_value / 100.0);
            if ($this->max_discount !== null) {
                $discount = min($discount, (float) $this->max_discount);
            }
        } else {
            $discount = (float) $this->discount_value;
        }
        $discount = min($discount, $subtotal);
        return round(max(0, $discount), 2);
    }
}
