<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class School extends Model {
    protected $fillable = ['user_id','school_code','name','address','is_independent','class_list',
        'onboarding','onboarding_status','submitted_at','reviewed_at','review_notes'];

    /** Public details stored in the unified `institute_profiles` table. */
    public function profile(){ return $this->hasOne(InstituteProfile::class,'institute_id','id')->where('institute_type','school'); }
    protected $casts = [
        'is_independent'=>'boolean','class_list'=>'array','onboarding'=>'array',
        'submitted_at'=>'datetime','reviewed_at'=>'datetime',
    ];
    public function user(){ return $this->belongsTo(User::class); }
    public function vendors(){ return $this->belongsToMany(Vendor::class,'school_vendor')->withPivot('royalty_percent','is_active'); }
    /** Amazon-style gate: only approved schools may log in / list products. */
    public function isApproved(): bool { return $this->onboarding_status === 'approved'; }
}
