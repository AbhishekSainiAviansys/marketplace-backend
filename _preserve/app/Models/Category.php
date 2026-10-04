<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Category extends Model {
    protected $fillable = ['name','slug','description','is_active'];
    public function fields(){ return $this->hasMany(CategoryField::class); }
}
