<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductStock extends Model
{
    protected $table = 'product_stock';

    protected $fillable = [
        'product_id',
        'variant_id',
        'colour',
        'color',
        'size',
        'quantity',
        'stock',
        'qty',
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
