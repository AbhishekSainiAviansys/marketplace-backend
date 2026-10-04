<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model {
    public $timestamps = false;
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['key','value','group','is_secret'];
    public static function getVal($key, $default = null) {
        $s = static::find($key);
        return $s ? $s->value : $default;
    }
}
