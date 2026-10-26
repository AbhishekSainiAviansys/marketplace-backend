<?php
namespace App\Http\Controllers;
use App\Models\Product;
use App\Models\ProductValue;
use App\Models\ProductImage;
use Illuminate\Http\Request;

class VendorController extends Controller {
    public function dashboard(Request $r){
        $v=$r->user()->vendor;
        return response()->json(['products_count'=>Product::where('vendor_id',$v->id)->count(),'schools_count'=>$v->schools()->count()]);
    }
    public function index(Request $r){ return Product::where('vendor_id',$r->user()->vendor->id)->with('category','values')->paginate(20); }
    public function store(Request $r){
        $d=$r->validate(['category_id'=>'required|exists:categories,id','name'=>'required','price'=>'required|numeric','mrp'=>'nullable|numeric','delivery_charge'=>'nullable|numeric','portal_charge'=>'nullable|numeric','server_charge'=>'nullable|numeric','stock'=>'integer','delivery_mode'=>'in:self,thirdparty,school_pickup','school_id'=>'nullable|exists:schools,id','fields'=>'array','images'=>'nullable','image'=>'nullable','image_url'=>'nullable','primary_image'=>'nullable']);
        $imageUrls=$this->productImageUrls($d);
        foreach (['images','image','image_url','primary_image'] as $imageKey) unset($d[$imageKey]);
        if (empty($imageUrls)) return response()->json(['message'=>'At least one product image with no background is required.'],422);
        $p=Product::create($d+['created_by_type'=>'vendor','created_by_id'=>$r->user()->vendor->id,'vendor_id'=>$r->user()->vendor->id]);
        foreach(($d['fields']??[]) as $fid=>$val) ProductValue::create(['product_id'=>$p->id,'field_id'=>$fid,'value_text'=>$val]);
        foreach ($imageUrls as $i=>$url) ProductImage::create(['product_id'=>$p->id,'url'=>$url,'is_primary'=>$i===0]);
        return response()->json($p->load('images'),201);
    }
    public function update(Request $r,$id){ $p=Product::where('vendor_id',$r->user()->vendor->id)->findOrFail($id); $p->update($r->only('name','price','mrp','delivery_charge','portal_charge','server_charge','stock','delivery_mode','is_active')); return $p; }
    public function destroy(Request $r,$id){ Product::where('vendor_id',$r->user()->vendor->id)->findOrFail($id)->delete(); return response()->json(['deleted'=>true]); }
    public function schools(Request $r){ return $r->user()->vendor->schools()->withPivot('royalty_percent')->get(); }
    public function royalties(Request $r){ return $r->user()->vendor->schools()->withPivot('royalty_percent')->get()->map(fn($s)=>['school'=>$s->name,'royalty'=>$s->pivot->royalty_percent]); }
    private function productImageUrls(array $d): array {
        $urls = [];
        $collect = function ($value) use (&$urls, &$collect): void {
            if (is_string($value)) {
                $urls[] = $value;
                return;
            }
            if (!is_array($value)) return;
            $found = false;
            foreach (['url','image_url','image','src','path','value','link','href'] as $k) {
                if (array_key_exists($k, $value) && (is_string($value[$k]) || is_array($value[$k]))) {
                    $collect($value[$k]);
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                foreach ($value as $item) $collect($item);
            }
        };
        if (isset($d['images'])) $collect($d['images']);
        foreach (['image','image_url','primary_image'] as $k) {
            if (isset($d[$k])) $collect($d[$k]);
        }
        $urls = array_values(array_unique(array_filter(array_map(static function ($v) { return trim((string) $v); }, $urls))));
        return $urls;
    }
}
