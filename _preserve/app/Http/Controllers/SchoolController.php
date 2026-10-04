<?php
namespace App\Http\Controllers;
use App\Models\Product;
use App\Models\ProductValue;
use Illuminate\Http\Request;

class SchoolController extends Controller {
    public function dashboard(Request $r){ $s=$r->user()->school; return response()->json(['school'=>$s,'vendors_count'=>$s->vendors()->count(),'products_count'=>Product::where('school_id',$s->id)->count()]); }
    public function vendors(Request $r){ return $r->user()->school->vendors()->withPivot('royalty_percent')->get(); }
    public function catalog(Request $r){
        $s=$r->user()->school; $vendorIds=$s->vendors()->pluck('vendors.id');
        return Product::whereIn('vendor_id',$vendorIds)->orWhere('school_id',$s->id)->with('category')->paginate(20);
    }
    public function index(Request $r){ $this->mustIndependent($r); return Product::where('school_id',$r->user()->school->id)->with('category','values')->paginate(20); }
    public function store(Request $r){
        $this->mustIndependent($r);
        $d=$r->validate(['category_id'=>'required|exists:categories,id','name'=>'required','price'=>'required|numeric','stock'=>'integer','delivery_mode'=>'in:self,thirdparty,school_pickup','fields'=>'array']);
        $p=Product::create($d+['created_by_type'=>'school','created_by_id'=>$r->user()->school->id,'school_id'=>$r->user()->school->id]);
        foreach(($d['fields']??[]) as $fid=>$val) ProductValue::create(['product_id'=>$p->id,'field_id'=>$fid,'value_text'=>$val]);
        return response()->json($p,201);
    }
    public function update(Request $r,$id){ $this->mustIndependent($r); $p=Product::where('school_id',$r->user()->school->id)->findOrFail($id); $p->update($r->only('name','price','stock','is_active')); return $p; }
    public function destroy(Request $r,$id){ $this->mustIndependent($r); Product::where('school_id',$r->user()->school->id)->findOrFail($id)->delete(); return response()->json(['deleted'=>true]); }
    private function mustIndependent(Request $r){ if(!$r->user()->school->is_independent) abort(response()->json(['message'=>'Only independent schools can add products'],403)); }
}
