<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductValue;
use App\Models\ProductVariant;
use App\Models\SubCategory;
use App\Traits\ManagesProductStock;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VendorController extends Controller
{
    use ManagesProductStock;

    public function dashboard(Request $r)
    {
        $v = $r->user()->vendor;

        return response()->json(['products_count' => Product::where('vendor_id', $v->id)->count(), 'schools_count' => $v->schools()->count()]);
    }

    public function index(Request $r)
    {
        return Product::where('vendor_id', $r->user()->vendor->id)
            ->with('category', 'subCategory', 'school', 'values')
            ->paginate(20);
    }

    public function productShow(Request $r, $id)
    {
        $query = Product::where('vendor_id', $r->user()->vendor->id)
            ->with('category', 'subCategory', 'school', 'values', 'images', 'variants', 'productStocks');

        return response()->json(is_numeric($id)
            ? $query->findOrFail($id)
            : $query->where('product_code', (string) $id)->firstOrFail());
    }

    public function subCategories(Request $r)
    {
        $data = $r->validate(['category_id' => 'required|exists:categories,id']);

        return SubCategory::where('category_id', $data['category_id'])
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }

    public function store(Request $r)
    {
        $vendor = $r->user()->vendor;
        $assignToSchool = $r->has('assign_to_school') ? $r->boolean('assign_to_school') : $r->filled('school_id');
        $d = $r->validate([
            'category_id' => 'required|exists:categories,id',
            'sub_category_id' => ['required', 'integer', Rule::exists('sub_categories', 'id')->where('category_id', $r->input('category_id'))->where('is_active', true)],
            'name' => 'required|string|max:190',
            'price' => 'required|numeric|min:0',
            'mrp' => 'nullable|numeric|min:0',
            'delivery_charge' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'delivery_mode' => 'nullable|in:self,thirdparty,school_pickup',
            'assign_to_school' => 'sometimes|boolean',
            'school_id' => [
                Rule::requiredIf($assignToSchool),
                'nullable',
                'integer',
                Rule::exists('school_vendor', 'school_id')->where('vendor_id', $vendor->id)->where('is_active', true),
            ],
            'assignment_charge' => 'nullable|numeric|min:0',
            'fields' => 'sometimes|array',
            'images' => 'nullable',
            'image' => 'nullable',
            'image_url' => 'nullable',
            'primary_image' => 'nullable',
            'is_variant' => 'boolean',
        ]);
        unset($d['assign_to_school']);
        $d['school_id'] = $assignToSchool ? (int) $d['school_id'] : null;
        $d['assignment_charge'] = $assignToSchool ? (float) ($d['assignment_charge'] ?? 0) : 0;
        $subCategory = SubCategory::findOrFail($d['sub_category_id']);
        $charges = $subCategory->calculateChargesFor((float) $d['price']);
        $d['portal_charge'] = $charges['portal_charge'];
        $d['server_charge'] = $charges['server_charge'];
        $imageUrls = $this->productImageUrls($d);
        foreach (['images', 'image', 'image_url', 'primary_image'] as $imageKey) {
            unset($d[$imageKey]);
        }
        if (empty($imageUrls)) {
            return response()->json(['message' => 'At least one product image with no background is required.'], 422);
        }
        $p = Product::create($d + ['created_by_type' => 'vendor', 'created_by_id' => $vendor->id, 'vendor_id' => $vendor->id]);
        foreach (($d['fields'] ?? []) as $fid => $val) {
            ProductValue::create(['product_id' => $p->id, 'field_id' => $fid, 'value_text' => $val]);
        }
        foreach ($imageUrls as $i => $url) {
            ProductImage::create(['product_id' => $p->id, 'url' => $url, 'is_primary' => $i === 0]);
        }

        $isVariant = (bool) ($d['is_variant'] ?? false);
        $vlist = $r->input('variants') ?? [];
        $hasVariants = is_array($vlist) && count($vlist) > 0;

        if ($isVariant) {
            $stock = 0;
            foreach ($vlist as $v) {
                if (! is_array($v)) {
                    continue;
                }
                $size = isset($v['size']) && $v['size'] !== '' ? (string) $v['size'] : null;
                $color = isset($v['color']) && $v['color'] !== '' ? (string) $v['color'] : null;
                $vstock = (int) ($v['stock'] ?? 0);
                ProductVariant::create([
                    'product_id' => $p->id,
                    'size' => $size,
                    'color' => $color,
                    'sku' => $v['sku'] ?? null,
                    'price' => isset($v['price']) && $v['price'] !== '' ? $v['price'] : null,
                    'stock' => $vstock,
                ]);
                $stock += $vstock;
            }
            $p->stock = $stock;
            $p->save();
            $p->is_variant = true;
            $p->save();
        } elseif ($hasVariants) {
            $stock = 0;
            ProductVariant::where('product_id', $p->id)->delete();
            foreach ($vlist as $v) {
                if (! is_array($v)) {
                    continue;
                }
                $size = isset($v['size']) && $v['size'] !== '' ? (string) $v['size'] : null;
                $color = isset($v['color']) && $v['color'] !== '' ? (string) $v['color'] : null;
                $vstock = (int) ($v['stock'] ?? 0);
                ProductVariant::create([
                    'product_id' => $p->id,
                    'size' => $size,
                    'color' => $color,
                    'sku' => $v['sku'] ?? null,
                    'price' => isset($v['price']) && $v['price'] !== '' ? $v['price'] : null,
                    'stock' => $vstock,
                ]);
                $stock += $vstock;
            }
            $p->stock = $stock;
            $p->save();
            $p->is_variant = true;
            $p->save();
        } elseif (! $isVariant) {
            $p->is_variant = false;
            $p->save();
        }

        $explicitStockRows = $this->extractStockRows($r);
        if (! empty($explicitStockRows)) {
            $this->persistProductStockRows($p, $explicitStockRows, 'product_created');
        } elseif ($hasVariants) {
            $this->persistProductStockRows($p, $this->stockRowsFromVariants($p), 'product_created');
        } elseif ($r->has('stock')) {
            $this->persistProductStockRows($p, [['quantity' => (int) $r->input('stock')]], 'product_created');
        }

        return response()->json($p->fresh()->load('images', 'productStocks', 'stockTrackings'), 201);
    }

    public function update(Request $r, $id)
    {
        $vendor = $r->user()->vendor;
        $q = Product::where('vendor_id', $vendor->id);
        $p = is_numeric($id) ? $q->findOrFail($id) : $q->where('product_code', $id)->firstOrFail();
        $categoryId = $r->input('category_id', $p->category_id);
        $assignmentSubmitted = $r->hasAny(['assign_to_school', 'school_id', 'assignment_charge']);
        $assignToSchool = $r->has('assign_to_school') ? $r->boolean('assign_to_school') : ($r->has('school_id') ? $r->filled('school_id') : (bool) $p->school_id);
        $d = $r->validate([
            'category_id' => 'sometimes|required|exists:categories,id',
            'sub_category_id' => ['sometimes', 'required', 'integer', Rule::exists('sub_categories', 'id')->where('category_id', $categoryId)->where('is_active', true)],
            'name' => 'sometimes|required|string|max:190',
            'price' => 'sometimes|required|numeric|min:0',
            'mrp' => 'sometimes|nullable|numeric|min:0',
            'delivery_charge' => 'sometimes|nullable|numeric|min:0',
            'stock' => 'sometimes|nullable|integer|min:0',
            'delivery_mode' => 'sometimes|nullable|in:self,thirdparty,school_pickup',
            'is_active' => 'sometimes|boolean',
            'fields' => 'sometimes|array',
            'images' => 'sometimes|nullable',
            'image' => 'sometimes|nullable',
            'image_url' => 'sometimes|nullable',
            'primary_image' => 'sometimes|nullable',
            'assign_to_school' => 'sometimes|boolean',
            'school_id' => [
                Rule::requiredIf($assignmentSubmitted && $assignToSchool && ! $p->school_id),
                'nullable',
                'integer',
                Rule::exists('school_vendor', 'school_id')->where('vendor_id', $vendor->id)->where('is_active', true),
            ],
            'assignment_charge' => 'sometimes|nullable|numeric|min:0',
        ]);
        $p->fill(collect($d)->only(['category_id', 'sub_category_id', 'name', 'price', 'mrp', 'delivery_charge', 'stock', 'delivery_mode', 'is_active'])->all());
        if ($assignmentSubmitted) {
            if ($assignToSchool) {
                if ($r->filled('school_id')) {
                    $p->school_id = (int) $d['school_id'];
                }
                $p->assignment_charge = (float) ($d['assignment_charge'] ?? $p->assignment_charge ?? 0);
            } else {
                $p->school_id = null;
                $p->assignment_charge = 0;
            }
        }
        if ($r->hasAny(['price', 'category_id', 'sub_category_id'])) {
            $subCategory = SubCategory::where('category_id', $p->category_id)->findOrFail($p->sub_category_id);
            $charges = $subCategory->calculateChargesFor((float) $p->price);
            $p->portal_charge = $charges['portal_charge'];
            $p->server_charge = $charges['server_charge'];
        }
        $p->save();
        if ($r->has('fields')) {
            ProductValue::where('product_id', $p->id)->delete();
            foreach (($d['fields'] ?? []) as $fieldId => $value) {
                ProductValue::create(['product_id' => $p->id, 'field_id' => $fieldId, 'value_text' => $value]);
            }
        }
        if ($r->hasAny(['images', 'image', 'image_url', 'primary_image'])) {
            $imageUrls = $this->productImageUrls($r->only('images', 'image', 'image_url', 'primary_image'));
            if (empty($imageUrls)) {
                return response()->json(['message' => 'At least one product image with no background is required.'], 422);
            }
            ProductImage::where('product_id', $p->id)->delete();
            foreach ($imageUrls as $i => $url) {
                ProductImage::create(['product_id' => $p->id, 'url' => $url, 'is_primary' => $i === 0]);
            }
        }
        $explicitStockRows = $this->extractStockRows($r);
        if (! empty($explicitStockRows)) {
            $this->persistProductStockRows($p, $explicitStockRows, 'product_updated');
        } elseif ($r->has('stock')) {
            $this->persistProductStockRows($p, [['quantity' => (int) $r->input('stock')]], 'product_updated');
        }

        return $p->fresh()->load('images', 'productStocks', 'stockTrackings');
    }

    public function destroy(Request $r, $id)
    {
        $q = Product::where('vendor_id', $r->user()->vendor->id);
        $product = is_numeric($id) ? $q->findOrFail($id) : $q->where('product_code', $id)->firstOrFail();
        $product->delete();

        return response()->json(['deleted' => true]);
    }

    public function schools(Request $r)
    {
        return $r->user()->vendor->schools()->wherePivot('is_active', true)->withPivot('royalty_percent', 'is_active')->get();
    }

    public function royalties(Request $r)
    {
        return $r->user()->vendor->schools()->withPivot('royalty_percent')->get()->map(fn ($s) => ['school' => $s->name, 'royalty' => $s->pivot->royalty_percent]);
    }

    private function productImageUrls(array $d): array
    {
        $urls = [];
        $collect = function ($value) use (&$urls, &$collect): void {
            if (is_string($value)) {
                $urls[] = $value;

                return;
            }
            if (! is_array($value)) {
                return;
            }
            $found = false;
            foreach (['url', 'image_url', 'image', 'src', 'path', 'value', 'link', 'href'] as $k) {
                if (array_key_exists($k, $value) && (is_string($value[$k]) || is_array($value[$k]))) {
                    $collect($value[$k]);
                    $found = true;
                    break;
                }
            }
            if (! $found) {
                foreach ($value as $item) {
                    $collect($item);
                }
            }
        };
        if (isset($d['images'])) {
            $collect($d['images']);
        }
        foreach (['image', 'image_url', 'primary_image'] as $k) {
            if (isset($d[$k])) {
                $collect($d[$k]);
            }
        }
        $urls = array_values(array_unique(array_filter(array_map(static function ($v) {
            return trim((string) $v);
        }, $urls))));

        return $urls;
    }
}
