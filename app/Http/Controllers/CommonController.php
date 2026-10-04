<?php
namespace App\Http\Controllers;
use App\Models\{Category,Product};
use Illuminate\Http\Request;

class CommonController extends Controller {
    public function categories(){ return Category::where('is_active',1)->with('fields')->get(); }
    public function fields($id){ return Category::findOrFail($id)->fields()->orderBy('sort_order')->get(); }
    public function products(Request $r){
        $q=Product::where('is_active',1)->with('category','images');
        if($r->category) $q->whereHas('category',fn($x)=>$x->where('slug',$r->category));
        if($r->school_id) $q->where('school_id',$r->school_id);
        if($r->search) $q->where('name','like','%'.$r->search.'%');
        return $q->paginate($r->per_page??20);
    }
    // ?folder=branding is allow-listed so branding assets stay out of the products folder.
    public function upload(Request $r){
        $r->validate(['image'=>'required|image|max:2048','folder'=>'nullable|in:products,branding']);
        $folder=$r->input('folder') ?: 'products';
        $p=$r->file('image')->store($folder,'public');
        return response()->json(['url'=>'/storage/'.$p,'path'=>$p]);
    }
}
