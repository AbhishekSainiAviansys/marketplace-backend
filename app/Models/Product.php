<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Product extends Model {
    protected $fillable = ['category_id','created_by_type','created_by_id','school_id','vendor_id','name','sku','price','mrp','stock','delivery_mode','payment_split','is_active'];
    protected $casts = ['payment_split'=>'array','is_active'=>'boolean'];
    public function category(){ return $this->belongsTo(Category::class); }
    public function values(){ return $this->hasMany(ProductValue::class); }
    public function images(){ return $this->hasMany(ProductImage::class); }
}
