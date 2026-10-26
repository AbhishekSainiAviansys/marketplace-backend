<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SubCategory extends Model {
    protected $fillable = ['category_id','name','slug','description','icon','is_active'];
    protected $casts = ['is_active'=>'boolean'];
    public function category(){ return $this->belongsTo(Category::class); }
}
