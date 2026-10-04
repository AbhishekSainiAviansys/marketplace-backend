<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Address extends Model {
    // Real location chain: country_id INT -> countries.country_id,
    // state_id VARCHAR -> states.state_subdivision_id,
    // district_id INT -> districts.id, area_id INT -> areas.id (replaces cities)
    protected $fillable = ['user_id','label','line1','line2','country_id','state_id','district_id','area_id','pincode','phone_code','phone','is_default'];
}

