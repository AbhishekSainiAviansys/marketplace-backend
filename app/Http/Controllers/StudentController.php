<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\User;
use App\Models\WishlistItem;
use App\Services\CouponService;
use App\Services\OrderService;
use App\Services\ProductStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function orders(Request $r)
    {
        $u = $r->user();

        return $u->orders()
            ->whereNotIn('payment_status', ['pending', 'failed', 'expired'])
            ->orderByDesc('placed_at')
            ->orderByDesc('id')
            ->get();
    }

    public function orderShow(Request $r, $order)
    {
        $u = $r->user();

        return Order::where('user_id', $u->id)
            ->whereNotIn('payment_status', ['pending', 'failed', 'expired'])
            ->where(function ($w) use ($order) {
                $w->where('id', $order)->orWhere('order_code', $order);
            })
            ->firstOrFail();
    }

    public function orderStore(Request $r, OrderService $orders)
    {
        $u = $r->user();
        $d = $r->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable',
            'items.*.product_id' => 'nullable',
            'items.*.product_code' => 'nullable|string',
            'items.*.qty' => 'nullable|integer|min:1',
            'items.*.color' => 'nullable|string|max:60',
            'items.*.size' => 'nullable|string|max:60',
            'total' => 'required|numeric|min:0',
            'pay_mode' => 'nullable|string|max:50',
            'delivery' => 'nullable|string|max:100',
            'address' => 'nullable|string',
            'coupon_code' => 'nullable|string|max:64',
        ]);
        $payMode = strtolower(trim((string) ($d['pay_mode'] ?? 'cash on delivery')));
        if (! in_array($payMode, ['cash on delivery', 'cod', 'pay at pickup'], true)) {
            abort(422, 'Online orders must use the Razorpay payment flow.');
        }
        $d['pay_mode'] = $payMode === 'pay at pickup' ? 'Pay at pickup' : 'Cash on Delivery';
        $order = $orders->create($u, $d, ['status' => 'Placed', 'payment_status' => 'unpaid']);

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
        /** @var Coupon $c */
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

    private function cartFor(User $u): Cart
    {
        return Cart::firstOrCreate(['user_id' => $u->id]);
    }

    private function cartOptionKey(?string $color, ?string $size): string
    {
        if (($color === null || $color === '') && ($size === null || $size === '')) {
            return 'default';
        }

        return hash('sha256', json_encode([$color, $size]));
    }

    private function resolveProduct($key): Product
    {
        if (is_numeric($key)) {
            $p = Product::find($key);
            if ($p) {
                return $p;
            }
        }

        return Product::where('product_code', (string) $key)->firstOrFail();
    }

    private function resolveStockRow(Product $product, string $color = '', string $size = ''): ?ProductStock
    {
        if ($color !== '' && $size !== '') {
            if (Schema::hasTable('product_stock')) {
                $row = ProductStock::where('product_id', $product->id)
                    ->where(function ($sq) use ($color) {
                        $sq->where('colour', $color)->orWhere('color', $color);
                    })
                    ->where('size', $size)
                    ->first();
                if ($row) {
                    return $row;
                }
            }
        }
        if ($color !== '') {
            if (Schema::hasTable('product_stock')) {
                $row = ProductStock::where('product_id', $product->id)
                    ->where(function ($sq) use ($color) {
                        $sq->where('colour', $color)->orWhere('color', $color);
                    })
                    ->first();
                if ($row) {
                    return $row;
                }
            }
        }
        if ($size !== '') {
            if (Schema::hasTable('product_stock')) {
                $row = ProductStock::where('product_id', $product->id)
                    ->where('size', $size)
                    ->first();
                if ($row) {
                    return $row;
                }
            }
        }
        if (Schema::hasTable('product_stock')) {
            return ProductStock::where('product_id', $product->id)->first();
        }

        return null;
    }

    public function cartIndex(Request $r)
    {
        $u = $r->user();
        $cart = $this->cartFor($u)->load('items.product');

        return $cart->items->map(fn ($i) => [
            'product_code' => (string) ($i->product?->product_code ?? $i->product_id),
            'qty' => (int) $i->qty,
            'color' => $i->color,
            'size' => $i->size,
        ])->values();
    }

    public function cartAdd(Request $r)
    {
        $u = $r->user();
        $key = $r->input('product_code') ?? $r->input('product') ?? $r->input('product_id');
        $r->validate(['qty' => 'nullable|integer|min:1', 'color' => 'nullable|string|max:60', 'size' => 'nullable|string|max:60']);
        if (empty($key)) {
            abort(422, 'product_id is required.');
        }
        $qty = (int) ($r->input('qty') ?? 1);
        $product = $this->resolveProduct($key);
        if (! $product->is_active) {
            abort(422, 'This product is no longer available.');
        }
        $color = $r->filled('color') ? (string) $r->input('color') : null;
        $size = $r->filled('size') ? (string) $r->input('size') : null;
        $inventory = app(ProductStockService::class);
        $hasVariants = $inventory->hasVariants($product);
        if ($hasVariants && ($color === null || $size === null)) {
            abort(422, 'Choose a colour and size before adding this product.');
        }
        $stockRecord = $inventory->findStockRecord($product, $color, $size);
        $available = $inventory->available($product, $stockRecord, $hasVariants);
        if ($hasVariants && ! $stockRecord) {
            abort(422, 'The selected product option is unavailable.');
        }
        $cart = $this->cartFor($u);
        $line = CartItem::firstOrNew([
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'option_key' => $this->cartOptionKey($color, $size),
            'color' => $color,
            'size' => $size,
        ]);
        $newQty = ($line->exists ? $line->qty : 0) + $qty;
        if ($newQty > $available) {
            abort(422, 'Only '.$available.' in stock for '.$product->name.'.');
        }
        $line->qty = $newQty;
        $line->save();

        return response()->json([
            'product_code' => (string) $product->product_code,
            'qty' => (int) $line->qty,
            'available' => $available,
            'color' => $line->color,
            'size' => $line->size,
        ], $line->wasRecentlyCreated ? 201 : 200);
    }

    public function cartUpdate(Request $r, $product)
    {
        $u = $r->user();
        $d = $r->validate(['qty' => 'required|integer|min:0', 'color' => 'nullable|string|max:60', 'size' => 'nullable|string|max:60']);
        $product = $this->resolveProduct($product);
        $cart = $this->cartFor($u);
        $color = ! empty($d['color']) ? (string) $d['color'] : null;
        $size = ! empty($d['size']) ? (string) $d['size'] : null;
        $line = CartItem::where('cart_id', $cart->id)->where('product_id', $product->id)
            ->where('option_key', $this->cartOptionKey($color, $size))->first();
        if (! $line) {
            return response()->json(['message' => 'Not in cart'], 404);
        }
        if ((int) $d['qty'] === 0) {
            $line->delete();

            return response()->json(['removed' => true]);
        }
        $inventory = app(ProductStockService::class);
        $hasVariants = $inventory->hasVariants($product);
        $stockRecord = $inventory->findStockRecord($product, $color, $size);
        $available = $inventory->available($product, $stockRecord, $hasVariants);
        if ((int) $d['qty'] > $available) {
            abort(422, 'Only '.$available.' in stock for '.$product->name.'.');
        }
        $line->qty = (int) $d['qty'];
        $line->save();

        return response()->json(['product_code' => (string) $product->product_code, 'qty' => (int) $line->qty, 'available' => $available]);
    }

    public function cartRemove(Request $r, $product)
    {
        $u = $r->user();
        $cart = $this->cartFor($u);
        $productId = $product;
        if (! is_numeric($product)) {
            $p = Product::where('product_code', $product)->first();
            $productId = $p?->id ?? $product;
        }
        $query = CartItem::where('cart_id', $cart->id)->where('product_id', $productId);
        if ($r->hasAny(['color', 'size'])) {
            $color = $r->filled('color') ? (string) $r->input('color') : null;
            $size = $r->filled('size') ? (string) $r->input('size') : null;
            $query->where('option_key', $this->cartOptionKey($color, $size));
        }
        $query->delete();

        return response()->json(['removed' => true]);
    }

    public function cartClear(Request $r)
    {
        $u = $r->user();
        $cart = Cart::where('user_id', $u->id)->first();
        if ($cart) {
            $cart->items()->delete();
        }

        return response()->json(['cleared' => true]);
    }

    public function wishlistIndex(Request $r)
    {
        $u = $r->user();

        return WishlistItem::where('user_id', $u->id)->with('product')->get()
            ->map(fn ($w) => (string) ($w->product?->product_code ?? $w->product_id))->values();
    }

    public function wishlistAdd(Request $r, $product)
    {
        $u = $r->user();
        $product = $this->resolveProduct($product);
        WishlistItem::firstOrCreate(['user_id' => $u->id, 'product_id' => $product->id]);

        return response()->json(['product_code' => (string) $product->product_code], 201);
    }

    public function wishlistRemove(Request $r, $product)
    {
        $u = $r->user();
        $productId = $product;
        if (! is_numeric($product)) {
            $p = Product::where('product_code', $product)->first();
            $productId = $p?->id ?? $product;
        }
        WishlistItem::where('user_id', $u->id)->where('product_id', $productId)->delete();

        return response()->json(['removed' => true]);
    }

    public function indexReviews(Request $r, $product)
    {
        $prod = $this->resolveProduct($product);

        return $prod->reviews()->with('user')->orderByDesc('created_at')->get()->map(fn ($rv) => ['id' => $rv->id, 'product_code' => (string) ($prod->product_code ?? $prod->id), 'rating' => (int) $rv->rating, 'comment' => $rv->comment, 'user_name' => $rv->user?->name, 'created_at' => $rv->created_at?->toDateTimeString()]);
    }

    public function storeReview(Request $r)
    {
        $u = $r->user();
        $prod = $this->resolveProduct($r->route('product'));
        $d = $r->validate(['rating' => 'required|integer|min:1|max:5', 'comment' => 'nullable|string', 'title' => 'nullable|string']);
        $rv = ProductReview::updateOrCreate(
            ['user_id' => $u->id, 'product_id' => $prod->id],
            ['rating' => (int) $d['rating'], 'comment' => $d['comment'] ?? null, 'title' => $d['title'] ?? null]
        );

        return response()->json($rv, 201);
    }

    public function productDetail(Request $r, $product)
    {
        $p = is_numeric($product) ? Product::findOrFail($product) : Product::where('product_code', (string) $product)->firstOrFail();
        $p->load(['stocks', 'variants', 'reviews.user']);
        // Merge product_stocks into rows for frontend
        $stockRows = [];
        if (Schema::hasTable('product_stock')) {
            $rows = ProductStock::where('product_id', $p->id)->get();
            foreach ($rows as $row) {
                $stockRows[] = [
                    'colour' => $row->colour ?? $row->color ?? '',
                    'color' => $row->colour ?? $row->color ?? '',
                    'color_code' => $row->color_code ?? null,
                    'size' => $row->size ?? '',
                    'quantity' => (int) ($row->quantity ?? $row->stock ?? $row->qty ?? 0),
                    'stock' => (int) ($row->quantity ?? $row->stock ?? $row->qty ?? 0),
                    'qty' => (int) ($row->quantity ?? $row->stock ?? $row->qty ?? 0),
                ];
            }
        }
        $totalStock = $stockRows ? array_sum(array_column($stockRows, 'quantity')) : 0;
        $rating = (float) $p->reviews->avg('rating');
        $reviewsCount = (int) $p->reviews->count();

        return ['product' => $p, 'stock' => (int) $totalStock, 'stock_rows' => $stockRows, 'rating' => $rating, 'reviews_count' => $reviewsCount];
    }

    public function productStock(Request $r, $product)
    {
        $p = is_numeric($product) ? Product::findOrFail($product) : Product::where('product_code', (string) $product)->firstOrFail();
        if (Schema::hasTable('product_stock')) {
            $rows = ProductStock::where('product_id', $p->id)->get()->map(fn ($row) => [
                'id' => $row->id,
                'colour' => $row->colour ?? $row->color ?? '',
                'color' => $row->colour ?? $row->color ?? '',
                'color_code' => $row->color_code ?? null,
                'size' => $row->size ?? '',
                'quantity' => (int) ($row->quantity ?? $row->stock ?? $row->qty ?? 0),
                'stock' => (int) ($row->quantity ?? $row->stock ?? $row->qty ?? 0),
                'qty' => (int) ($row->quantity ?? $row->stock ?? $row->qty ?? 0),
            ])->values();
        } else {
            $rows = collect([]);
        }
        $totalStock = $rows->sum(fn ($row) => $row['quantity']);
        $outOfStock = $totalStock <= 0;

        return ['stock_rows' => $rows, 'total_stock' => (int) $totalStock, 'out_of_stock' => $outOfStock];
    }

    public function profile(Request $r)
    {
        $u = $r->user();
        $u->load(['orders', 'addresses']);

        return response()->json($u);
    }

    public function profileUpdate(Request $r)
    {
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

        if (array_key_exists('phone', $d) && ! array_key_exists('whatsapp', $d)) {
            $d['whatsapp'] = $d['phone'];
        }

        $avatarCols = ['avatar', 'photo', 'profile_photo', 'avatar_url', 'image'];
        $avatarValue = null;
        $avatarProvided = false;
        foreach ($avatarCols as $col) {
            if (array_key_exists($col, $d)) {
                $avatarProvided = true;
                if ($d[$col] !== null) {
                    $avatarValue = $d[$col];
                }
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

        if (! empty($data)) {
            $u->update($data);
        }

        $u->load(['orders', 'addresses']);

        return response()->json($u);
    }

    public function profilePhoto(Request $r)
    {
        $file = null;
        foreach (['image', 'photo', 'avatar', 'file', 'picture', 'profile_photo'] as $key) {
            if ($r->hasFile($key)) {
                $file = $r->file($key);
                break;
            }
        }
        if (! $file) {
            abort(422, 'Image is required.');
        }
        $validator = validator(['image' => $file], ['image' => 'image|max:2048']);
        if ($validator->fails()) {
            abort(422, $validator->errors()->first());
        }

        $path = $file->store('students/avatars', 'public');
        $url = '/storage/'.$path;

        $u = $r->user();
        $avatarCols = ['avatar', 'photo', 'profile_photo', 'avatar_url', 'image'];
        $data = [];
        foreach ($avatarCols as $col) {
            if (Schema::hasColumn('users', $col)) {
                $data[$col] = $url;
            }
        }
        if (! empty($data)) {
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

    public function profilePhotoDestroy(Request $r)
    {
        $u = $r->user();
        $avatarCols = ['avatar', 'photo', 'profile_photo', 'avatar_url', 'image'];
        $data = [];
        foreach ($avatarCols as $col) {
            if (Schema::hasColumn('users', $col)) {
                $data[$col] = null;
            }
        }
        if (! empty($data)) {
            $u->update($data);
        }

        $u->load(['orders', 'addresses']);

        return response()->json(['deleted' => true, 'user' => $u]);
    }
}
