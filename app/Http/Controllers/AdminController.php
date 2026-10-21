<?php
namespace App\Http\Controllers;
use App\Models\{User,Vendor,School,Category,CategoryField,Product,ProductValue};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminController extends Controller {
    // GET /admin/dashboard – panel counters. Was missing: the Admin UI already
    // called /admin/dashboard and always fell back to "API offline".
    public function dashboard(){
        return response()->json([
            'vendors_count'=>User::where('role','vendor')->count(),
            'schools_count'=>School::count(),
            'products_count'=>Product::count(),
            'categories_count'=>Category::count(),
            'assignments_count'=>\DB::table('school_vendor')->count(),
        ]);
    }
    /** Where-clause for ?country_id=&state_id=&district_id= against the
     *  onboarding JSON both wizards write (vendors: business.*, schools:
     *  institution.*). Values were saved as strings ('105') or ints (105)
     *  depending on the wizard version, so both spellings are matched.
     *
     *  NOTE: the JSON path must use nested arrows ("onboarding->business->
     *  country_id"). A dotted path ("onboarding->business.country_id") is
     *  quoted as a SINGLE key by the query grammar and compiles to
     *  json_extract(onboarding, '$."business.country_id"'), which never
     *  matches — the location filters silently returned zero rows. */
    private function locationFilter($q, string $relation, string $group, Request $r){
        $map = ['country_id'=>'country_id','state_id'=>'state_id','district_id'=>'district_id'];
        foreach($map as $param=>$field){
            if(!$r->filled($param)) continue;
            $v = $r->input($param);
            $path = "onboarding->{$group}->{$field}";
            $q->whereHas($relation, fn($w)=>$w->where(function($x) use ($path,$v){
                $x->where($path, (string)$v)
                  ->orWhere($path, (int)$v);
            }));
        }
        return $q;
    }
    public function index(Request $r){
        $q = User::where('role','vendor')->with('vendor')
            ->orderByDesc('users.created_at');
        if($r->filled('status')) $q->whereHas('vendor', fn($w)=>$w->where('onboarding_status',$r->string('status')));
        // ?search= matches shop name, owner name, email or whatsapp.
        // ?country_id=&state_id=&district_id= match business.* inside onboarding JSON.
        $q = $this->locationFilter($q, 'vendor', 'business', $r);
        if($r->filled('search')){
            $s = $r->string('search');
            $q->where(function($w) use ($s){
                $w->where('name','like',"%{$s}%")
                  ->orWhere('email','like',"%{$s}%")
                  ->orWhere('whatsapp','like',"%{$s}%")
                  ->orWhereHas('vendor', fn($x)=>$x->where('shop_name','like',"%{$s}%"));
            });
        }
        $page = $q->paginate(20);
        // Products-per-vendor for the rows on this page (one grouped query —
        // nested withCount dot-notation is unreliable across versions).
        $vids = $page->getCollection()->pluck('vendor.id')->filter()->all();
        $counts = $vids
            ? Product::whereIn('vendor_id',$vids)->groupBy('vendor_id')->selectRaw('vendor_id, COUNT(*) c')->pluck('c','vendor_id')
            : [];
        foreach($page->getCollection() as $u){
            $u->products_count = (int)($counts[$u->vendor->id] ?? 0);
        }
        return $page;
    }
    /** GET /admin/vendors/stats — per-status counts for the list tabs. */
    public function vendorStats(){
        $rows = Vendor::selectRaw('onboarding_status, COUNT(*) c')->groupBy('onboarding_status')->pluck('c','onboarding_status');
        return response()->json([
            'total'=>(int)Vendor::count(),
            'draft'=>(int)$rows->get('draft',0),
            'submitted'=>(int)$rows->get('submitted',0),
            'approved'=>(int)$rows->get('approved',0),
            'rejected'=>(int)$rows->get('rejected',0),
        ]);
    }
    public function store(Request $r){
        $d=$r->validate(['name'=>'required','email'=>'nullable|email|unique:users','whatsapp'=>'nullable|unique:users','password'=>'required|min:6','shop_name'=>'required']);
        $u=User::create(['name'=>$d['name'],'email'=>$d['email']??null,'whatsapp'=>$d['whatsapp']??null,'password'=>Hash::make($d['password']),'role'=>'vendor']);
        $u->vendor()->create(['shop_name'=>$d['shop_name']]);
        return response()->json($u->load('vendor'),201);
    }
    /** Enriched profile for the admin Vendors screen: full onboarding JSON,
     *  listed products and linked schools (pivot royalty) in one call. */
    public function show($id){ return User::where('role','vendor')->with(['vendor.schools','vendor.products.category'])->findOrFail($id); }
    public function update(Request $r,$id){ $u=User::findOrFail($id); $u->update($r->only('name','is_active')); $u->vendor->update($r->only('shop_name','gst','address')); return response()->json($u->load('vendor')); }
    public function destroy($id){ User::findOrFail($id)->delete(); return response()->json(['deleted'=>true]); }

    /**
     * POST /admin/vendors/{id}/review — Amazon-style application review.
     * approve flips the vendor live (unlocks login + selling endpoints);
     * reject stores feedback the applicant sees when they reopen /sell.
     */
    public function review(Request $r,$id){
        $d=$r->validate(['action'=>'required|in:approve,reject','notes'=>'nullable|string|max:2000']);
        $u=User::where('role','vendor')->with('vendor')->findOrFail($id);
        $v=$u->vendor;
        if(!$v) return response()->json(['message'=>'No vendor profile'],404);
        $approved=$d['action']==='approve';
        $v->update([
            'onboarding_status'=>$approved?'approved':'rejected',
            'reviewed_at'=>now(),
            'review_notes'=>$approved?null:($d['notes']??'Please correct your application details.'),
        ]);
        NotificationController::push($u->id,
            $approved?'Application approved':'Application needs changes',
            $approved?'Congratulations — you can now sign in and start listing products.'
                     :($v->review_notes),
            'onboarding');
        return response()->json($v->fresh()->only(['id','shop_name','onboarding_status','reviewed_at','review_notes']));
    }

    /** GET /admin/schools/stats — per-status counts for the list tabs. */
    public function schoolStats(){
        $rows = School::selectRaw('onboarding_status, COUNT(*) c')->groupBy('onboarding_status')->pluck('c','onboarding_status');
        return response()->json([
            'total'=>(int)School::count(),
            'draft'=>(int)$rows->get('draft',0),
            'submitted'=>(int)$rows->get('submitted',0),
            'approved'=>(int)$rows->get('approved',0),
            'rejected'=>(int)$rows->get('rejected',0),
        ]);
    }
    /** GET /admin/schools — mirrors index(): status tabs, search, location filters. */
    public function schoolIndex(Request $r){
        $q = User::where('role','school')->with('school')
            ->orderByDesc('users.created_at');
        if($r->filled('status')) $q->whereHas('school', fn($w)=>$w->where('onboarding_status',$r->string('status')));
        if($r->filled('search')){
            $s = $r->string('search');
            $q->where(function($w) use ($s){
                $w->where('name','like',"%{$s}%")
                  ->orWhere('email','like',"%{$s}%")
                  ->orWhere('whatsapp','like',"%{$s}%")
                  ->orWhereHas('school', fn($x)=>$x->where('name','like',"%{$s}%")->orWhere('school_code','like',"%{$s}%"));
            });
        }
        // ?country_id=&state_id=&district_id= match institution.* inside onboarding JSON.
        $q = $this->locationFilter($q, 'school', 'institution', $r);
        return $q->paginate(20);
    }
    public function schoolStore(Request $r){
        $d=$r->validate(['name'=>'required','email'=>'nullable|email|unique:users','whatsapp'=>'nullable|unique:users','password'=>'required|min:6','school_name'=>'required','school_code'=>'required|unique:schools','is_independent'=>'boolean','class_list'=>'array']);
        $u=User::create(['name'=>$d['name'],'email'=>$d['email']??null,'whatsapp'=>$d['whatsapp']??null,'password'=>Hash::make($d['password']),'role'=>'school']);
        $s=$u->school()->create(['school_code'=>$d['school_code'],'name'=>$d['school_name'],'is_independent'=>$d['is_independent']??false,'class_list'=>$d['class_list']??[]]);
        return response()->json($s->load('user'),201);
    }
    public function schoolUpdate(Request $r,$id){ $s=School::findOrFail($id); $s->update($r->only('name','address','is_independent','class_list')); return response()->json($s); }
    public function schoolDestroy($id){ $s=School::findOrFail($id); $s->user->delete(); return response()->json(['deleted'=>true]); }

    /** Enriched profile for the admin Schools screen: full onboarding JSON + linked vendors. */
    public function schoolShow($id){ return User::where('role','school')->with(['school.vendors'])->findOrFail($id); }

    /**
     * POST /admin/schools/{id}/review — Amazon-style application review.
     * approve flips the school live (unlocks login + school panel endpoints);
     * reject stores feedback the applicant sees when they reopen the wizard.
     */
    public function schoolReview(Request $r,$id){
        $d=$r->validate(['action'=>'required|in:approve,reject','notes'=>'nullable|string|max:2000']);
        $u=User::where('role','school')->with('school')->findOrFail($id);
        $s=$u->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $approved=$d['action']==='approve';
        $s->update([
            'onboarding_status'=>$approved?'approved':'rejected',
            'reviewed_at'=>now(),
            'review_notes'=>$approved?null:($d['notes']??'Please correct your application details.'),
        ]);
        NotificationController::push($u->id,
            $approved?'Application approved':'Application needs changes',
            $approved?'Congratulations — you can now sign in and start using the school panel.'
                     :($s->review_notes),
            'onboarding');
        return response()->json($s->fresh()->only(['id','name','onboarding_status','reviewed_at','review_notes']));
    }

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
    public function productIndex(Request $r){
        $q=Product::with('category','values','images');
        // ?search= powers the Home-content boost picker.
        if($r->search) $q->where('name','like','%'.$r->search.'%');
        return $q->paginate($r->per_page??20);
    }
    public function productStore(Request $r){ return $this->saveProduct($r, 'admin', $r->user()->id); }
    public function productUpdate(Request $r,$id){ $p=Product::findOrFail($id); $p->update($r->only('price','mrp','stock','is_active','delivery_mode')); return $p; }

    private function saveProduct(Request $r, $type, $id){
        $d=$r->validate(['category_id'=>'required|exists:categories,id','name'=>'required','price'=>'required|numeric','mrp'=>'nullable|numeric','stock'=>'integer','delivery_mode'=>'in:self,thirdparty,school_pickup','school_id'=>'nullable|exists:schools,id','vendor_id'=>'nullable|exists:vendors,id','fields'=>'array','payment_split'=>'array']);
        $p=Product::create($d+['created_by_type'=>$type,'created_by_id'=>$id]);
        foreach (($d['fields']??[]) as $fid=>$val) ProductValue::create(['product_id'=>$p->id,'field_id'=>$fid,'value_text'=>$val]);
        return response()->json($p->load('values'),201);
    }
}
