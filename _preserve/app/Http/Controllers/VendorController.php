<?php
namespace App\Http\Controllers;
use App\Models\Product;
use App\Models\ProductValue;
use Illuminate\Http\Request;

class VendorController extends Controller {
    public function dashboard(Request $r){
        $v=$r->user()->vendor;
        return response()->json(['products_count'=>Product::where('vendor_id',$v->id)->count(),'schools_count'=>$v->schools()->count()]);
    }
    public function index(Request $r){ return Product::where('vendor_id',$r->user()->vendor->id)->with('category','values')->paginate(20); }
    public function store(Request $r){
        $d=$r->validate(['category_id'=>'required|exists:categories,id','name'=>'required','price'=>'required|numeric','stock'=>'integer','delivery_mode'=>'in:self,thirdparty,school_pickup','school_id'=>'nullable|exists:schools,id','fields'=>'array']);
        $p=Product::create($d+['created_by_type'=>'vendor','created_by_id'=>$r->user()->vendor->id,'vendor_id'=>$r->user()->vendor->id]);
        foreach(($d['fields']??[]) as $fid=>$val) ProductValue::create(['product_id'=>$p->id,'field_id'=>$fid,'value_text'=>$val]);
        return response()->json($p,201);
    }
    public function update(Request $r,$id){ $p=Product::where('vendor_id',$r->user()->vendor->id)->findOrFail($id); $p->update($r->only('name','price','mrp','stock','delivery_mode','is_active')); return $p; }
    public function destroy(Request $r,$id){ Product::where('vendor_id',$r->user()->vendor->id)->findOrFail($id)->delete(); return response()->json(['deleted'=>true]); }
    public function schools(Request $r){ return $r->user()->vendor->schools()->withPivot('royalty_percent')->get(); }
    public function royalties(Request $r){ return $r->user()->vendor->schools()->withPivot('royalty_percent')->get()->map(fn($s)=>['school'=>$s->name,'royalty'=>$s->pivot->royalty_percent]); }
}
