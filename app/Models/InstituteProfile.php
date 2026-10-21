<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InstituteProfile extends Model
{
    protected $fillable = [
        'institute_type','institute_id','website','logo_url','banner_url',
        'contact_person','contact_phone',
        'contact_email','detailed_address','country_id','state_id','district_id',
        'established_year','registration_number','board_affiliation','recognition_status',
        'medium_of_instruction','student_strength','streams','classes',
    ];

    protected $casts = [
        'country_id'=>'integer','district_id'=>'integer',
        'streams'=>'array','classes'=>'array',
    ];

    public function institute()
    {
        return $this->morphTo();
    }
}