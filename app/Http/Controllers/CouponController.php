<?php
namespace App\Http\Controllers;

use App\Models\Coupon;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    public function index()
    {
        return Coupon::orderByDesc('id')->get();
    }

    public function store(Request $r)
    {
        $d = $r->validate([
            'code' => 'required|string|max:64|unique:coupons,code',
            'title' => 'nullable|string|max:150',
            'description' => 'nullable|string',
            'type' => 'required|in:applied_once,first_user,festival,promotional',
            'discount_type' => 'required|in:percent,flat',
            'discount_value' => 'required|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'per_user_limit' => 'nullable|integer|min:1',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
            'is_active' => 'nullable|boolean',
        ]);
        $d['code'] = strtoupper(trim($d['code']));
        if (!isset($d['per_user_limit'])) $d['per_user_limit'] = 1;
        if (!isset($d['is_active'])) $d['is_active'] = true;
        return response()->json(Coupon::create($d), 201);
    }

    public function update(Request $r, $id)
    {
        $c = Coupon::findOrFail($id);
        $d = $r->validate([
            'code' => 'sometimes|required|string|max:64|unique:coupons,code,' . $id,
            'title' => 'nullable|string|max:150',
            'description' => 'nullable|string',
            'type' => 'sometimes|required|in:applied_once,first_user,festival,promotional',
            'discount_type' => 'sometimes|required|in:percent,flat',
            'discount_value' => 'sometimes|required|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'per_user_limit' => 'nullable|integer|min:1',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
            'is_active' => 'nullable|boolean',
        ]);
        if (isset($d['code'])) $d['code'] = strtoupper(trim($d['code']));
        $c->update($d);
        return $c->fresh();
    }

    public function destroy($id)
    {
        Coupon::findOrFail($id)->delete();
        return response()->json(['deleted' => true]);
    }
    
}
