<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CoachingKeyword extends Model
{
    protected $fillable = ['coaching_institute_id', 'keyword'];
    public $timestamps = true;

    public function institute()
    {
        return $this->belongsTo(CoachingInstitute::class, 'coaching_institute_id');
    }
}