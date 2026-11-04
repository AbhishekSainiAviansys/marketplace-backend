<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class Product extends Model
{
    protected $fillable = ['product_code', 'category_id', 'sub_category_id', 'created_by_type', 'created_by_id', 'added_by_role', 'added_by_id', 'school_id', 'vendor_id', 'name', 'sku', 'price', 'mrp', 'delivery_charge', 'portal_charge', 'server_charge', 'stock', 'delivery_mode', 'payment_split', 'is_active', 'is_boost', 'boost_until'];

    protected $hidden = ['id'];

    protected $casts = ['payment_split' => 'array', 'is_active' => 'boolean', 'is_variant' => 'boolean', 'is_boost' => 'boolean', 'boost_until' => 'datetime'];

    public function getProductCodeAttribute($value)
    {
        if (! empty($value)) {
            return $value;
        }
        if ($this->id) {
            return 'PRD'.str_pad((string) $this->id, 6, '0', STR_PAD_LEFT);
        }

        return null;
    }

    protected static function booted(): void
    {
        static::created(function (self $product) {
            if (! Schema::hasColumn('products', 'product_code')) {
                return;
            }
            if (empty($product->getRawOriginal('product_code')) && empty($product->product_code)) {
                // product_code accessor may be computed; check raw attribute
            }
            if (empty($product->getAttributes()['product_code'] ?? null)) {
                $product->product_code = 'PRD'.str_pad((string) $product->id, 6, '0', STR_PAD_LEFT);
                $product->saveQuietly();
            }
        });
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Category fields (attribute definitions) for this product's category.
     * Linked through products.category_id -> category_fields.category_id.
     */
    public function fields()
    {
        return $this->hasMany(CategoryField::class, 'category_id', 'category_id');
    }

    public function categoryFields()
    {
        return $this->fields();
    }

    /**
     * Attributes actually filled for this product, with their stored value
     * exposed on the pivot (value_text).
     */
    public function attributes()
    {
        return $this->belongsToMany(CategoryField::class, 'product_values', 'product_id', 'field_id')
            ->withPivot('value_text');
    }

    public function subCategory()
    {
        return $this->belongsTo(SubCategory::class);
    }

    public function values()
    {
        return $this->hasMany(ProductValue::class);
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function productStock()
    {
        return $this->hasMany(ProductStock::class);
    }

    public function productStocks()
    {
        return $this->hasMany(ProductStock::class);
    }

    public function stocks()
    {
        return $this->hasMany(ProductStock::class);
    }

    public function stockTracking()
    {
        return $this->hasMany(StockTracking::class);
    }

    public function stockTrackings()
    {
        return $this->hasMany(StockTracking::class);
    }

    public function reviews()
    {
        return $this->hasMany(ProductReview::class);
    }

    public function getVariantStockAttribute()
    {
        if ($this->is_variant) {
            return $this->variants->sum('stock');
        }

        return (int) $this->stock;
    }

    public function getHasVariantsAttribute(): bool
    {
        return (bool) $this->is_variant;
    }
}
