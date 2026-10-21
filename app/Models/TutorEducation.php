<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TutorEducation extends Model
{
    protected $table = 'tutor_education';

    protected $fillable = [
        'institute_type','institute_id','degree','university',
        'year','specialization','description',
    ];

    protected $casts = [];
}
