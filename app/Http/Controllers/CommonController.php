<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class CommonController extends Controller
{
    private function storefrontRelations(bool $details = false): array
    {
        $relations = ['category', 'subCategory:id,category_id,name,slug,description,icon,is_active', 'images', 'variants'];
        if ($details) {
            $relations[] = 'values';
            if (Schema::hasTable('category_fields')) {
                $relations[] = 'values.field';
            }
        }
        if (Schema::hasTable('product_stock')) {
            $relations[] = 'productStocks';
        }

        return $relations;
    }

    private function presentStorefrontProduct(Product $product): Product
    {
        $product->price = round(
            (float) $product->price + (float) ($product->portal_charge ?? 0) + (float) ($product->server_charge ?? 0),
            2,
        );

        return $product->makeHidden(['portal_charge', 'server_charge', 'assignment_charge']);
    }

    public function categories()
    {
        return Category::where('is_active', 1)->with(['fields' => function ($q) {
            $q->orderBy('sort_order')->orderBy('id');
        }, 'subCategories' => function ($q) {
            $q->select('id', 'category_id', 'name', 'slug', 'description', 'icon', 'is_active')
                ->where('is_active', 1)
                ->orderBy('name');
        }])->get();
    }

    public function fields($id)
    {
        return Category::findOrFail($id)->fields()->orderBy('sort_order')->get();
    }

    public function products(Request $r)
    {
        // ?ids=1,2,3 — targeted fetch (boosted "featured" row on the home page).
        if ($r->ids !== null && $r->ids !== '') {
            $tokens = array_values(array_filter(array_map('trim', explode(',', $r->ids))));
            if (! $tokens) {
                return response()->json([]);
            }
            $q = Product::where(function ($w) use ($tokens) {
                $w->whereIn('product_code', $tokens);
                $numeric = array_values(array_filter(array_map('intval', $tokens), fn ($v) => $v > 0));
                if ($numeric) {
                    $w->orWhereIn('id', $numeric);
                }
            })->where('is_active', 1)->with($this->storefrontRelations());
            if ($r->boolean('boosted')) {
                $q->where('is_boost', true)
                    ->where(function ($w) {
                        $w->whereNull('boost_until')->orWhere('boost_until', '>=', now());
                    });
            }

            return response()->json($q->get()->map(fn (Product $product) => $this->presentStorefrontProduct($product)));
        }
        $q = Product::where('is_active', 1)->with($this->storefrontRelations());
        // Category filter accepts the slug OR the display name so the student
        // app can pass its ?cat=Book Bundle values straight through.
        if ($r->category) {
            $q->whereHas('category', fn ($x) => $x->where('slug', $r->category)->orWhere('name', $r->category));
        }
        if ($r->sub_category) {
            $q->whereHas('subCategory', fn ($x) => $x->where('slug', $r->sub_category)->orWhere('name', $r->sub_category));
        }
        if ($r->school_id) {
            $q->where('school_id', $r->school_id);
        }
        if ($r->search) {
            $q->where('name', 'like', '%'.$r->search.'%');
        }
        if ($r->boolean('boosted')) {
            $q->where('is_boost', true)
                ->where(function ($w) {
                    $w->whereNull('boost_until')->orWhere('boost_until', '>=', now());
                });
        }
        // ?random=1 — "surprise picks" row on the home page.
        if ($r->random) {
            $q->inRandomOrder();
        }
        // Optional sort for storefront grids.
        if ($r->sort === 'price_asc') {
            $q->orderBy('price');
        } elseif ($r->sort === 'price_desc') {
            $q->orderByDesc('price');
        } elseif ($r->sort === 'newest') {
            $q->orderByDesc('id');
        }

        $products = $q->paginate($r->per_page ?? 20);
        $products->getCollection()->transform(fn (Product $product) => $this->presentStorefrontProduct($product));

        return $products;
    }

    public function productShow($id)
    {
        $product = null;
        if (is_numeric($id)) {
            $product = Product::where('is_active', 1)->with($this->storefrontRelations(true))->find($id);
        }
        if (! $product) {
            $product = Product::where('is_active', 1)->where('product_code', (string) $id)->with($this->storefrontRelations(true))->first();
        }
        if (! $product) {
            abort(404);
        }

        return response()->json($this->presentStorefrontProduct($product));
    }

    public function upload(Request $r)
    {
        $r->validate(['image' => 'required|image|max:2048', 'folder' => 'nullable|in:products,branding,vendors,categories,students,avatars,profile,users']);
        $folder = $r->input('folder') ?: 'products';
        $p = $r->file('image')->store($folder, 'public');

        return response()->json(['url' => '/storage/'.$p, 'path' => $p]);
    }
}
