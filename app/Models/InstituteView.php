<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InstituteView extends Model
{
    protected $fillable = [
        'institute_type','institute_id','student_user_id','event',
        'country_name','state_name','district_name',
        'filter_q','filter_type','source',
    ];

    protected $casts = ['student_user_id' => 'integer'];
}
