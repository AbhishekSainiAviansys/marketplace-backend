<?php
namespace App\Http\Controllers;
use App\Models\{Category,Product};
use Illuminate\Http\Request;

class CommonController extends Controller {
    public function categories(){ return Category::where('is_active',1)->with(['fields' => function ($q) { $q->orderBy('sort_order')->orderBy('id'); }])->get(); }
    public function fields($id){ return Category::findOrFail($id)->fields()->orderBy('sort_order')->get(); }
    public function products(Request $r){
        // ?ids=1,2,3 — targeted fetch (boosted "featured" row on the home page).
        if($r->ids!==null && $r->ids!==''){
            $ids=array_values(array_filter(array_map('intval',explode(',',$r->ids))));
            if(!$ids) return response()->json([]);
            $q=Product::whereIn('id',$ids)->where('is_active',1)->with('category','images');
            if ($r->boolean('boosted')) {
                $q->where('is_boost', true)
                  ->where(function ($w) { $w->whereNull('boost_until')->orWhere('boost_until', '>=', now()); });
            }
            return response()->json($q->get());
        }
        $q=Product::where('is_active',1)->with('category','images');
        // Category filter accepts the slug OR the display name so the student
        // app can pass its ?cat=Book Bundle values straight through.
        if($r->category) $q->whereHas('category',fn($x)=>$x->where('slug',$r->category)->orWhere('name',$r->category));
        if($r->school_id) $q->where('school_id',$r->school_id);
        if($r->search) $q->where('name','like','%'.$r->search.'%');
        if ($r->boolean('boosted')) {
            $q->where('is_boost', true)
              ->where(function ($w) { $w->whereNull('boost_until')->orWhere('boost_until', '>=', now()); });
        }
        // ?random=1 — "surprise picks" row on the home page.
        if($r->random) $q->inRandomOrder();
        return $q->paginate($r->per_page??20);
    }
    // ?folder=branding is allow-listed so branding assets stay out of the products folder.
    public function upload(Request $r){
        $r->validate(['image'=>'required|image|max:2048','folder'=>'nullable|in:products,branding,vendors,categories,students,avatars,profile,users']);
        $folder=$r->input('folder') ?: 'products';
        $p=$r->file('image')->store($folder,'public');
        return response()->json(['url'=>'/storage/'.$p,'path'=>$p]);
    }
}
