<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Vendor extends Model {
    protected $fillable = ['user_id','shop_name','gst','address','commission_default',
        'onboarding','onboarding_status','submitted_at','reviewed_at','review_notes'];
    protected $casts = [
        'onboarding' => 'array',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];
    public function user(){ return $this->belongsTo(User::class); }
    public function schools(){ return $this->belongsToMany(School::class,'school_vendor')->withPivot('royalty_percent','is_active'); }
    /** Products listed by this seller (products.vendor_id). */
    public function products(){ return $this->hasMany(Product::class); }
    /** Amazon-style gate: only approved sellers may log in / list products. */
    public function isApproved(): bool { return $this->onboarding_status === 'approved'; }
}
