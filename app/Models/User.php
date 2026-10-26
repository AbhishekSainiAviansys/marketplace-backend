<?php
namespace App\Models;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable {
    use HasApiTokens;
    protected $fillable = ['name','email','whatsapp','phone_country_code','phone_e164','password','role','is_active','fcm_token','avatar','photo','profile_photo','avatar_url','image'];
    protected $hidden = ['password','remember_token'];
    public function vendor(){ return $this->hasOne(Vendor::class); }
    public function school(){ return $this->hasOne(School::class); }
    public function coachingInstitute(){ return $this->hasOne(CoachingInstitute::class); }
    public function addresses(){ return $this->hasMany(Address::class); }
    public function orders(){ return $this->hasMany(Order::class); }
}

