<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubCategory extends Model
{
    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'description',
        'icon',
        'is_active',
        'portal_charge_type',
        'portal_charge_value',
        'server_charge_type',
        'server_charge_value',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'portal_charge_value' => 'decimal:2',
        'server_charge_value' => 'decimal:2',
    ];

    /**
     * @return array{portal_charge: float, server_charge: float}
     */
    public function calculateChargesFor(float $basePrice): array
    {
        return [
            'portal_charge' => $this->calculateCharge($basePrice, $this->portal_charge_type, (float) $this->portal_charge_value),
            'server_charge' => $this->calculateCharge($basePrice, $this->server_charge_type, (float) $this->server_charge_value),
        ];
    }

    private function calculateCharge(float $basePrice, string $type, float $value): float
    {
        $amount = $type === 'percentage' ? $basePrice * $value / 100 : $value;

        return round(max(0, $amount), 2);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
