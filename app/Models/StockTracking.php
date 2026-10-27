<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockTracking extends Model
{
    protected $table = 'stock_tracking';

    public $timestamps = false;

    const CREATED_AT = 'created_at';
    const UPDATED_AT = null;

    protected $fillable = [
        'product_id',
        'variant_id',
        'colour',
        'color',
        'size',
        'delta',
        'quantity',
        'change',
        'qty',
        'reason',
        'created_at',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
