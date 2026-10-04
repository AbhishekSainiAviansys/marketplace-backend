<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Vendor extends Model {
    protected $fillable = ['user_id','shop_name','gst','address','commission_default'];
    public function user(){ return $this->belongsTo(User::class); }
    public function schools(){ return $this->belongsToMany(School::class,'school_vendor')->withPivot('royalty_percent','is_active'); }
}
