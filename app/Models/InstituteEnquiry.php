<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InstituteEnquiry extends Model
{
    protected $fillable = [
        'institute_type','institute_id','student_user_id',
        'name','contact','enquiry_for',
        'country_id','state_id','district_id',
        'country_name','state_name','district_name','source',
    ];

    protected $casts = [
        'country_id' => 'integer',
        'district_id' => 'integer',
        'student_user_id' => 'integer',
    ];
}
