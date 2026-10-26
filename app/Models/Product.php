<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Product extends Model {
    protected $fillable = ['category_id','sub_category_id','created_by_type','created_by_id','added_by_role','added_by_id','school_id','vendor_id','name','sku','price','mrp','delivery_charge','portal_charge','server_charge','stock','delivery_mode','payment_split','is_active','is_boost','boost_until'];
    protected $casts = ['payment_split'=>'array','is_active'=>'boolean','is_boost'=>'boolean','boost_until'=>'datetime'];
    public function category(){ return $this->belongsTo(Category::class); }
    public function subCategory(){ return $this->belongsTo(SubCategory::class); }
    public function values(){ return $this->hasMany(ProductValue::class); }
    public function images(){ return $this->hasMany(ProductImage::class); }
    public function variants(){ return $this->hasMany(ProductVariant::class); }
}
