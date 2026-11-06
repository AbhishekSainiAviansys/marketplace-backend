<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BackAccount extends Model
{
    protected $table = 'back_accounts';

    protected $fillable = ['user_id', 'account_name', 'account_id', 'account_type', 'status', 'details'];
    protected $casts = [
        'details' => 'array',
    ];

    /** The user that owns this back account. */
    public function user()
    {
        return $this->belongsTo(User::class);
}
}
