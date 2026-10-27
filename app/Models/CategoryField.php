<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class CategoryField extends Model {
    protected $fillable = ['category_id','field_name','field_label','field_type','options','is_required','sort_order'];
    protected $casts = ['options'=>'array','is_required'=>'boolean'];
    protected $appends = ['name'];
    public function getNameAttribute(){ return $this->field_name ?: $this->field_label; }
}
