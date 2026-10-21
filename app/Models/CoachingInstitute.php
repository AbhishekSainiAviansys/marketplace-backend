<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * A coaching centre / private tutor institute registered through the
 * /coaching panel. Separate table from `schools` by design: own code
 * (COA-*), own type discriminator and the location columns the student
 * directory filters on.
 */
class CoachingInstitute extends Model {
    protected $fillable = ['user_id','institute_code','name','institute_type','address',
        'country_id','state_id','district_id','onboarding','onboarding_status',
        'submitted_at','reviewed_at','review_notes'];

    /** Public details stored in the unified `institute_profiles` table. */
    public function profile(){ return $this->hasOne(InstituteProfile::class,'institute_id','id')->where('institute_type','coaching'); }
    protected $casts = [
        'onboarding'=>'array',
        'country_id'=>'integer','district_id'=>'integer',
        'submitted_at'=>'datetime','reviewed_at'=>'datetime',
    ];
    public function user(){ return $this->belongsTo(User::class); }
    public function keywords(){ return $this->hasMany(CoachingKeyword::class,'coaching_institute_id')->orderBy('keyword'); }
    /** Instant-activation flow: rows are created 'approved'; kept for parity with School. */
    public function isApproved(): bool { return $this->onboarding_status === 'approved'; }
}