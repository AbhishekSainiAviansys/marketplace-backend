<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InstituteCourse extends Model
{
    protected $table = 'institute_courses';

    protected $fillable = [
        'institute_type','institute_id','name','subject','level',
        'batch','duration','fee_range','description',
    ];

    protected $casts = [];
}
