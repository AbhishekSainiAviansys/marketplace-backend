<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InstitutePortfolio extends Model
{
    protected $table = 'institute_portfolio';

    protected $fillable = [
        'institute_type','institute_id','kind','label','url',
    ];

    protected $casts = [];
}
