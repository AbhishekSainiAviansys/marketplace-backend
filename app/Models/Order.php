<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Order extends Model {
    protected $fillable = ['user_id','order_code','items','subtotal','delivery_charge','gst_rate','gst_amount','total','coupon_code','coupon_discount','coupon_id','pay_mode','delivery','address','status','payment_status','payment_provider','provider_order_id','payment_ref','placed_at','paid_at','tracking_number','courier','tracking_url','shipped_at','delivered_at','cancelled_at','refunded_at','refund_ref','admin_note','last_notified_at'];
    protected $casts = ['items' => 'array', 'subtotal' => 'decimal:2', 'delivery_charge' => 'decimal:2', 'gst_rate' => 'decimal:2', 'gst_amount' => 'decimal:2', 'coupon_discount' => 'decimal:2', 'total' => 'decimal:2', 'placed_at' => 'datetime', 'paid_at' => 'datetime', 'shipped_at' => 'datetime', 'delivered_at' => 'datetime', 'cancelled_at' => 'datetime', 'refunded_at' => 'datetime', 'last_notified_at' => 'datetime'];
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
