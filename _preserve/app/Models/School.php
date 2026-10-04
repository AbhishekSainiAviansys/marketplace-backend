<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class School extends Model {
    protected $fillable = ['user_id','school_code','name','address','is_independent','class_list'];
    protected $casts = ['is_independent'=>'boolean','class_list'=>'array'];
    public function user(){ return $this->belongsTo(User::class); }
    public function vendors(){ return $this->belongsToMany(Vendor::class,'school_vendor')->withPivot('royalty_percent','is_active'); }
}
