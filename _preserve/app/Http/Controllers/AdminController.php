<?php
namespace App\Http\Controllers;
use App\Models\{User,Vendor,School,Category,CategoryField,Product,ProductValue};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminController extends Controller {
    public function index(){ return User::where('role','vendor')->with('vendor')->paginate(20); }
    public function store(Request $r){
        $d=$r->validate(['name'=>'required','email'=>'nullable|email|unique:users','whatsapp'=>'nullable|unique:users','password'=>'required|min:6','shop_name'=>'required']);
        $u=User::create(['name'=>$d['name'],'email'=>$d['email']??null,'whatsapp'=>$d['whatsapp']??null,'password'=>Hash::make($d['password']),'role'=>'vendor']);
        $u->vendor()->create(['shop_name'=>$d['shop_name']]);
        return response()->json($u->load('vendor'),201);
    }
    public function show($id){ return User::where('role','vendor')->with('vendor')->findOrFail($id); }
    public function update(Request $r,$id){ $u=User::findOrFail($id); $u->update($r->only('name','is_active')); $u->vendor->update($r->only('shop_name','gst','address')); return response()->json($u->load('vendor')); }
    public function destroy($id){ User::findOrFail($id)->delete(); return response()->json(['deleted'=>true]); }

    public function schoolIndex(){ return School::with('user')->paginate(20); }
    public function schoolStore(Request $r){
        $d=$r->validate(['name'=>'required','email'=>'nullable|email|unique:users','whatsapp'=>'nullable|unique:users','password'=>'required|min:6','school_name'=>'required','school_code'=>'required|unique:schools','is_independent'=>'boolean','class_list'=>'array']);
        $u=User::create(['name'=>$d['name'],'email'=>$d['email']??null,'whatsapp'=>$d['whatsapp']??null,'password'=>Hash::make($d['password']),'role'=>'school']);
        $s=$u->school()->create(['school_code'=>$d['school_code'],'name'=>$d['school_name'],'is_independent'=>$d['is_independent']??false,'class_list'=>$d['class_list']??[]]);
        return response()->json($s->load('user'),201);
    }
    public function schoolUpdate(Request $r,$id){ $s=School::findOrFail($id); $s->update($r->only('name','address','is_independent','class_list')); return response()->json($s); }
    public function schoolDestroy($id){ $s=School::findOrFail($id); $s->user->delete(); return response()->json(['deleted'=>true]); }

    public function assign(Request $r){
        $d=$r->validate(['school_id'=>'required|exists:schools,id','vendor_id'=>'required|exists:vendors,id','royalty_percent'=>'required|numeric|min:0|max:100']);
        \DB::table('school_vendor')->updateOrInsert(['school_id'=>$d['school_id'],'vendor_id'=>$d['vendor_id']],['royalty_percent'=>$d['royalty_percent'],'is_active'=>1,'updated_at'=>now()]);
        $school=School::with('user')->find($d['school_id']); $vendor=Vendor::with('user')->find($d['vendor_id']);
        if($school?->user) NotificationController::push($school->user->id,'Vendor assigned','Vendor '.$vendor->shop_name.' linked with '.$d['royalty_percent'].'% royalty','assign');
        if($vendor?->user) NotificationController::push($vendor->user->id,'School assigned','School '.$school->name.' linked with '.$d['royalty_percent'].'% royalty','assign');
        return response()->json(['assigned'=>true]+$d);
    }
    public function notify(Request $r){
        $d=$r->validate(['title'=>'required','body'=>'nullable','user_id'=>'nullable|exists:users,id','role'=>'nullable|in:admin,vendor,school,student']);
        if(!empty($d['user_id'])) return response()->json(NotificationController::push($d['user_id'],$d['title'],$d['body']??'','admin'));
        if(!empty($d['role'])) return response()->json(NotificationController::pushRole($d['role'],$d['title'],$d['body']??'','admin'));
        return response()->json(['message'=>'Provide user_id or role'],422);
    }
    public function catIndex(){ return Category::with('fields')->get(); }
    public function catStore(Request $r){ $d=$r->validate(['name'=>'required','slug'=>'required|unique:categories']); $d['slug']=Str::slug($d['slug']); return Category::create($d); }
    public function catUpdate(Request $r,$id){ $c=Category::findOrFail($id); $c->update($r->only('name','description','is_active')); return $c; }
    public function catDestroy($id){ Category::findOrFail($id)->delete(); return response()->json(['deleted'=>true]); }
    public function fieldStore(Request $r){ $d=$r->validate(['category_id'=>'required|exists:categories,id','field_name'=>'required','field_label'=>'required','field_type'=>'required','is_required'=>'boolean']); return CategoryField::create($d); }
    public function fieldUpdate(Request $r,$id){ $f=CategoryField::findOrFail($id); $f->update($r->all()); return $f; }
    public function fieldDestroy($id){ CategoryField::findOrFail($id)->delete(); return response()->json(['deleted'=>true]); }
    public function productIndex(){ return Product::with('category','values','images')->paginate(20); }
    public function productStore(Request $r){ return $this->saveProduct($r, 'admin', $r->user()->id); }
    public function productUpdate(Request $r,$id){ $p=Product::findOrFail($id); $p->update($r->only('price','mrp','stock','is_active','delivery_mode')); return $p; }

    private function saveProduct(Request $r, $type, $id){
        $d=$r->validate(['category_id'=>'required|exists:categories,id','name'=>'required','price'=>'required|numeric','mrp'=>'nullable|numeric','stock'=>'integer','delivery_mode'=>'in:self,thirdparty,school_pickup','school_id'=>'nullable|exists:schools,id','vendor_id'=>'nullable|exists:vendors,id','fields'=>'array','payment_split'=>'array']);
        $p=Product::create($d+['created_by_type'=>$type,'created_by_id'=>$id]);
        foreach (($d['fields']??[]) as $fid=>$val) ProductValue::create(['product_id'=>$p->id,'field_id'=>$fid,'value_text'=>$val]);
        return response()->json($p->load('values'),201);
    }
}
