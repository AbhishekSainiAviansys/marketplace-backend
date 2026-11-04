<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class ProductValue extends Model {
    public $timestamps = false;
    protected $appends = ['value', 'field_name', 'field_label'];
    protected $fillable = ['product_id','field_id','value_text'];
    public function field(){ return $this->belongsTo(CategoryField::class, 'field_id'); }
    // Convenience accessor so JSON exposes `value` for the student app.
    public function getValueAttribute(){ return $this->value_text; }
    public function getFieldNameAttribute(){ if (! \Illuminate\Support\Facades\Schema::hasTable('category_fields')) { return null; } return $this->field?->field_name ?? $this->field?->field_label; }
    public function getFieldLabelAttribute(){ if (! \Illuminate\Support\Facades\Schema::hasTable('category_fields')) { return null; } return $this->field?->field_label; }
}
