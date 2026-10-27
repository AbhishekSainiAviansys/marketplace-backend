<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class ProductValue extends Model {
    public $timestamps = false;
    protected $appends = ['value'];
    protected $fillable = ['product_id','field_id','value_text'];
    public function field(){ return $this->belongsTo(CategoryField::class, 'field_id'); }
    // Convenience accessor so JSON exposes `value` for the student app.
    public function getValueAttribute(){ return $this->value_text; }
}
