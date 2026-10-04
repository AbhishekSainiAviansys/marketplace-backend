<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class ProductValue extends Model {
    public $timestamps = false;
    protected $fillable = ['product_id','field_id','value_text'];
}
