<?php
namespace App\Http\Controllers;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\WishlistItem;
use App\Services\OrderService;
use App\Services\CouponService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class StudentController extends Controller {
    public function orders(Request $r) {
        $u = $r->user();
        return $u->orders()->orderByDesc('placed_at')->orderByDesc('id')->get();
    }
    public function orderShow(Request $r, $order) {
        $u = $r->user();
        return Order::where('user_id', $u->id)
            ->where(function ($w) use ($order) {
                $w->where('id', $order)->orWhere('order_code', $order);
            })
            ->firstOrFail();
    }
    public function orderStore(Request $r, OrderService $orders) {
        $u = $r->user();
        $d = $r->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable',
            'items.*.product_id' => 'nullable',
            'items.*.product_code' => 'nullable|string',
            'items.*.qty' => 'nullable|integer|min:1',
            'total' => 'required|numeric|min:0',
            'pay_mode' => 'nullable|string|max:50',
            'delivery' => 'nullable|string|max:100',
            'address' => 'nullable|string',
            'status' => 'nullable|string|max:30',
            'payment_status' => 'nullable|string|max:20',
            'payment_provider' => 'nullable|string|max:30',
            'provider_order_id' => 'nullable|string|max:64',
            'payment_ref' => 'nullable|string|max:64',
            'coupon_code' => 'nullable|string|max:64',
        ]);
        $payment = array_intersect_key($d, array_flip(['status','payment_status','payment_provider','provider_order_id','payment_ref']));
        if (!empty($d['paid_at'])) $payment['paid_at'] = $d['paid_at'];
        $order = $orders->create($u, $d, $payment);
        return response()->json($order, 201);
    }
    public function couponValidate(Request $r, CouponService $coupons)
    {
        $u = $r->user();
        $d = $r->validate([
            'code' => 'required|string|max:64',
            'subtotal' => 'nullable|numeric|min:0',
        ]);
        $subtotal = (float) ($d['subtotal'] ?? 0);
        $res = $coupons->validateCode($d['code'], $u, $subtotal);
        /** @var \App\Models\Coupon $c */
        $c = $res['coupon'];
        return response()->json([
            'code' => $c->code,
            'type' => $c->type,
            'discount_type' => $c->discount_type,
            'discount_value' => (float) $c->discount_value,
            'discount_amount' => $res['discount_amount'],
            'message' => 'Coupon applied successfully.',
        ]);
    }
    private function cartFor(User $u): Cart { return Cart::firstOrCreate(['user_id' => $u->id]); }
    private function resolveProduct($key): Product {
        if (is_numeric($key)) {
            $p = Product::find($key);
            if ($p) return $p;
        }
        return Product::where('product_code', (string) $key)->firstOrFail();
    }
    public function cartIndex(Request $r) {
        $u = $r->user();
        $cart = $this->cartFor($u)->load('items.product');
        return $cart->items->map(fn($i) => ['product_code' => (string) ($i->product?->product_code ?? $i->product_id), 'qty' => (int) $i->qty])->values();
    }
    public function cartAdd(Request $r) {
        $u = $r->user();
        $key = $r->input('product_code') ?? $r->input('product') ?? $r->input('product_id');
        $r->validate(['qty' => 'nullable|integer|min:1']);
        if (empty($key)) abort(422, 'product_id is required.');
        $qty = (int) ($r->input('qty') ?? 1);
        $product = $this->resolveProduct($key);
        if (!$product->is_active) abort(422, 'This product is no longer available.');
        $cart = $this->cartFor($u);
        $line = CartItem::firstOrNew(['cart_id' => $cart->id, 'product_id' => $product->id]);
        $newQty = ($line->exists ? $line->qty : 0) + $qty;
        if ($newQty > $product->stock) abort(422, 'Only '.$product->stock.' in stock for '.$product->name.'.');
        $line->qty = $newQty;
        $line->save();
        return response()->json(['product_code' => (string) $product->product_code, 'qty' => (int) $line->qty], 201);
    }
    public function cartUpdate(Request $r, $product) {
        $u = $r->user();
        $d = $r->validate(['qty' => 'required|integer|min:0']);
        $product = $this->resolveProduct($product);
        $cart = $this->cartFor($u);
        $line = CartItem::where('cart_id', $cart->id)->where('product_id', $product->id)->first();
        if (!$line) return response()->json(['message' => 'Not in cart'], 404);
        if ((int) $d['qty'] === 0) { $line->delete(); return response()->json(['removed' => true]); }
        if ((int) $d['qty'] > $product->stock) abort(422, 'Only '.$product->stock.' in stock for '.$product->name.'.');
        $line->qty = (int) $d['qty'];
        $line->save();
        return response()->json(['product_code' => (string) $product->product_code, 'qty' => (int) $line->qty]);
    }
    public function cartRemove(Request $r, $product) {
        $u = $r->user();
        $cart = $this->cartFor($u);
        $productId = $product;
        if (!is_numeric($product)) {
            $p = Product::where('product_code', $product)->first();
            $productId = $p?->id ?? $product;
        }
        CartItem::where('cart_id', $cart->id)->where('product_id', $productId)->delete();
        return response()->json(['removed' => true]);
    }
    public function cartClear(Request $r) {
        $u = $r->user();
        $cart = Cart::where('user_id', $u->id)->first();
        if ($cart) $cart->items()->delete();
        return response()->json(['cleared' => true]);
    }
    public function wishlistIndex(Request $r) {
        $u = $r->user();
        return WishlistItem::where('user_id', $u->id)->with('product')->get()
            ->map(fn($w) => (string) ($w->product?->product_code ?? $w->product_id))->values();
    }
    public function wishlistAdd(Request $r, $product) {
        $u = $r->user();
        $product = $this->resolveProduct($product);
        WishlistItem::firstOrCreate(['user_id' => $u->id, 'product_id' => $product->id]);
        return response()->json(['product_code' => (string) $product->product_code], 201);
    }
    public function wishlistRemove(Request $r, $product) {
        $u = $r->user();
        $productId = $product;
        if (!is_numeric($product)) {
            $p = Product::where('product_code', $product)->first();
            $productId = $p?->id ?? $product;
        }
        WishlistItem::where('user_id', $u->id)->where('product_id', $productId)->delete();
        return response()->json(['removed' => true]);
    }

    public function profile(Request $r) {
        $u = $r->user();
        $u->load(['orders', 'addresses']);
        return response()->json($u);
    }
    public function profileUpdate(Request $r) {
        $u = $r->user();
        $rules = [
            'name' => 'sometimes|string|max:150',
            'email' => ['sometimes', 'nullable', 'email', 'max:190'],
            'whatsapp' => ['sometimes', 'nullable', 'string', 'max:30'],
            'phone' => 'sometimes|nullable|string|max:30',
            'phone_country_code' => 'sometimes|nullable|string|max:8',
            'phone_e164' => ['sometimes', 'nullable', 'string', 'max:32'],
            'avatar' => 'sometimes|nullable|string|max:500',
            'photo' => 'sometimes|nullable|string|max:500',
            'profile_photo' => 'sometimes|nullable|string|max:500',
            'avatar_url' => 'sometimes|nullable|string|max:500',
            'image' => 'sometimes|nullable|string|max:500',
        ];
        if (Schema::hasColumn('users', 'email')) {
            $rules['email'][] = Rule::unique('users', 'email')->ignore($u->id);
        }
        if (Schema::hasColumn('users', 'whatsapp')) {
            $rules['whatsapp'][] = Rule::unique('users', 'whatsapp')->ignore($u->id);
        }
        if (Schema::hasColumn('users', 'phone_e164')) {
            $rules['phone_e164'][] = Rule::unique('users', 'phone_e164')->ignore($u->id);
        }
        $d = $r->validate($rules);

        if (array_key_exists('phone', $d) && !array_key_exists('whatsapp', $d)) {
            $d['whatsapp'] = $d['phone'];
        }

        $avatarCols = ['avatar', 'photo', 'profile_photo', 'avatar_url', 'image'];
        $avatarValue = null;
        $avatarProvided = false;
        foreach ($avatarCols as $col) {
            if (array_key_exists($col, $d)) {
                $avatarProvided = true;
                if ($d[$col] !== null) $avatarValue = $d[$col];
            }
        }
        if ($avatarProvided) {
            foreach ($avatarCols as $col) {
                if (array_key_exists($col, $d) && $d[$col] === null) {
                    $avatarValue = null;
                }
            }
        }

        $data = [];
        foreach ($d as $key => $value) {
            if (Schema::hasColumn('users', $key)) {
                $data[$key] = $value;
            }
        }
        if ($avatarProvided) {
            foreach ($avatarCols as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $data[$col] = $avatarValue;
                }
            }
        }

        if (!empty($data)) {
            $u->update($data);
        }

        $u->load(['orders', 'addresses']);
        return response()->json($u);
    }

    public function profilePhoto(Request $r) {
        $file = null;
        foreach (['image', 'photo', 'avatar', 'file', 'picture', 'profile_photo'] as $key) {
            if ($r->hasFile($key)) {
                $file = $r->file($key);
                break;
            }
        }
        if (!$file) {
            abort(422, 'Image is required.');
        }
        $validator = validator(['image' => $file], ['image' => 'image|max:2048']);
        if ($validator->fails()) {
            abort(422, $validator->errors()->first());
        }

        $path = $file->store('students/avatars', 'public');
        $url = '/storage/' . $path;

        $u = $r->user();
        $avatarCols = ['avatar', 'photo', 'profile_photo', 'avatar_url', 'image'];
        $data = [];
        foreach ($avatarCols as $col) {
            if (Schema::hasColumn('users', $col)) {
                $data[$col] = $url;
            }
        }
        if (!empty($data)) {
            $u->update($data);
        }

        $u->load(['orders', 'addresses']);
        return response()->json([
            'url' => $url,
            'path' => $path,
            'avatar' => $url,
            'photo' => $url,
            'profile_photo' => $url,
            'avatar_url' => $url,
            'image' => $url,
            'user' => $u,
        ], 201);
    }

    public function profilePhotoDestroy(Request $r) {
        $u = $r->user();
        $avatarCols = ['avatar', 'photo', 'profile_photo', 'avatar_url', 'image'];
        $data = [];
        foreach ($avatarCols as $col) {
            if (Schema::hasColumn('users', $col)) {
                $data[$col] = null;
            }
        }
        if (!empty($data)) {
            $u->update($data);
        }

        $u->load(['orders', 'addresses']);
        return response()->json(['deleted' => true, 'user' => $u]);
    }

}