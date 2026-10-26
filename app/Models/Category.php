<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Category extends Model {
    protected $fillable = ['name','slug','description','icon','is_active','is_size','is_colour'];
    protected $casts = ['is_active'=>'boolean','is_size'=>'boolean','is_colour'=>'boolean'];
    public function fields(){ return $this->hasMany(CategoryField::class); }
    public function subCategories(){ return $this->hasMany(SubCategory::class); }
}
