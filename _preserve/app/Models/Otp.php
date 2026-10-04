<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Otp extends Model {
    public $timestamps = false;
    protected $fillable = ['identifier','otp','expires_at','is_verified','attempts'];
}
