<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Credential extends Model
{
    protected $table = 'credentials';

    protected $fillable = ['title', 'public', 'private', 'api', 'desc', 'status'];

    public $timestamps = false;

    public function scopeActive($q)
    {
        return $q->where('status', 'like', 'Active%');
    }

    public function scopeRazorpay($q)
    {
        return $q->where('title', 'like', '%razorpay%');
    }

    public function getKeyIdAttribute(): ?string
    {
        return $this->public;
    }

    public function getKeySecretAttribute(): ?string
    {
        return $this->private;
    }

    public function getWebhookSecretAttribute(): ?string
    {
        return $this->api;
    }
}