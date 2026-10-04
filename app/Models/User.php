<?php
namespace App\Models;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable {
    use HasApiTokens;
    protected $fillable = ['name','email','whatsapp','phone_country_code','phone_e164','password','role','is_active'];
    protected $hidden = ['password','remember_token'];
    public function vendor(){ return $this->hasOne(Vendor::class); }
    public function school(){ return $this->hasOne(School::class); }
}

