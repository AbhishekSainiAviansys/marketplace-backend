<?php
namespace App\Http\Controllers;
use App\Models\{User,Vendor,School,Category,CategoryField,Product,ProductValue};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminController extends Controller {

    // GET /admin/dashboard - panel counters. Was missing: the Admin UI already
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

    /**
     * Where-clause for ?country_id=&state_id=&district_id= against the
     * onboarding JSON both wizards write (vendors: business.*, schools:
     * institution.*). Values were saved as strings ('105') or ints (105)
     * depending on the wizard version, so both spellings are matched.
     *
     * NOTE: the JSON path must use nested arrows ("onboarding->business->
     * country_id"). A dotted path ("onboarding->business.country_id") is
     * quoted as a SINGLE key by the query grammar and compiles to
     * json_extract(onboarding, '$."business.country_id"'), which never
     * matches - the location filters silently returned zero rows.
     */
    private function locationFilter($q, string $relation, string $group, Request $r){
        $params = [];
        foreach (['country_id','state_id','district_id'] as $p) {
            if ($r->filled($p)) $params[$p] = $r->input($p);
        }

        if (empty($params)) return $q;

        // Addresses are stored on the User (addresses.user_id), and the admin
        // list queries are rooted on User, so the relation is always 'addresses'.
        $addressRelation = 'addresses';

        $q->where(function ($outer) use ($relation, $group, $params, $addressRelation) {
            // Branch A: onboarding JSON (existing behaviour).
            $outer->whereHas($relation, function ($w) use ($group, $params) {
                foreach ($params as $param => $v) {
                    $path = "onboarding->{$group}->{$param}";
                    $w->where(function ($x) use ($path, $v) {
                        $x->where($path, (string)$v)
                          ->orWhere($path, (int)$v);
                    });
                }
            });

            // Branch B: a saved address row (single-address upsert flow).
            // Only apply when the addresses table exists (keeps unit tests
            // that don't create it passing).
            if (\Illuminate\Support\Facades\Schema::hasTable('addresses')) {
                $outer->orWhereHas($addressRelation, function ($w) use ($params) {
                    foreach ($params as $param => $v) {
                        $w->where(function ($x) use ($param, $v) {
                            $x->where($param, (string)$v)
                              ->orWhere($param, (int)$v);
                        });
                    }
                });
            }
        });

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
        // Products-per-vendor for the rows on this page (one grouped query -
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

    /** GET /admin/vendors/stats - per-status counts for the list tabs. */
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
    public function show($id){
        return User::where('role','vendor')->with(['vendor.schools','vendor.products.category'])->findOrFail($id);
    }

    public function update(Request $r,$id){
        $u=User::findOrFail($id);
        $u->update($r->only('name','is_active'));
        $u->vendor->update($r->only('shop_name','gst','address'));
        return response()->json($u->load('vendor'));
    }

    public function destroy($id){
        User::findOrFail($id)->delete();
        return response()->json(['deleted'=>true]);
    }

    /**
     * POST /admin/vendors/{id}/review - Amazon-style application review.
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
            $approved?'Congratulations - you can now sign in and start listing products.'
                     :($v->review_notes),
            'onboarding');
        return response()->json($v->fresh()->only(['id','shop_name','onboarding_status','reviewed_at','review_notes']));
    }

    /**
     * GET /admin/schools - school_new directory with status/search/location filters.
     *
     * Storage convention in school_new (verified against live data):
     *   - country  : stores the country ID directly        (e.g. 105)
     *   - state    : stores the state ID directly          (e.g. 14694)
     *   - district : stores the district NAME as text      (e.g. "Meerut")
     *   - school_status: Active / Inactive / Deleted
     *
     * The admin UI sends onboarding vocabulary for status
     * (submitted/approved/rejected/draft), so we map it back to the
     * directory vocabulary before filtering.
     */
    public function schoolIndex(Request $r){
        $q = \DB::table('school_new')->select('school_new.*', 'school_name as name', 'school_email as email', 'school_mobile as whatsapp')->orderByDesc('id');

        // ---- status filter (with vocabulary mapping) ----
        if($r->filled('status')){
            $status = (string) $r->string('status');
            $statusMap = [
                'submitted' => 'Active',
                'approved'  => 'Active',
                'rejected'  => 'Inactive',
                'draft'     => 'Inactive',
            ];
            if (isset($statusMap[$status])) $status = $statusMap[$status];
            $q->where('school_status', $status);
        }

        // ---- free-text search ----
        if($r->filled('search')){
            $s = '%'.$r->string('search').'%';
            $q->where(function($w) use ($s){
                $w->where('school_name','like',$s)
                  ->orWhere('school_code','like',$s)
                  ->orWhere('city','like',$s)
                  ->orWhere('district','like',$s)
                  ->orWhere('school_email','like',$s);
            });
        }

        // ---- location filters ----
        // country & state are stored as IDs in school_new - compare directly.
        if($r->filled('country_id')){
            $q->where('country', $r->input('country_id'));
        }
        if($r->filled('state_id')){
            $q->where('state', $r->input('state_id'));
        }
        // district is stored as the NAME, so resolve district_id -> district_name.
        if($r->filled('district_id')){
            $districtName = \DB::table('districts')
                ->where('id', $r->input('district_id'))
                ->value('district_name');
            if($districtName !== null){
                $q->where('district', $districtName);
            } else {
                $q->whereRaw('1=0');
            }
        }

        return $q->paginate(20);
    }

    public function schoolStore(Request $r){
        $d=$r->validate(['name'=>'required','email'=>'nullable|email|unique:users','whatsapp'=>'nullable|unique:users','password'=>'required|min:6','school_name'=>'required','school_code'=>'required|unique:schools','is_independent'=>'boolean','class_list'=>'array']);
        $u=User::create(['name'=>$d['name'],'email'=>$d['email']??null,'whatsapp'=>$d['whatsapp']??null,'password'=>Hash::make($d['password']),'role'=>'school']);
        $s=$u->school()->create(['school_code'=>$d['school_code'],'name'=>$d['school_name'],'is_independent'=>$d['is_independent']??false,'class_list'=>$d['class_list']??[]]);
        return response()->json($s->load('user'),201);
    }

    public function schoolUpdate(Request $r,$id){
        $s=School::findOrFail($id);
        $s->update($r->only('name','address','is_independent','class_list'));
        return response()->json($s);
    }

    public function schoolDestroy($id){
        $s=School::findOrFail($id);
        $s->user->delete();
        return response()->json(['deleted'=>true]);
    }

    /** Enriched profile for the admin Schools screen: full onboarding JSON + linked vendors. */
    public function schoolShow($id){
        $s = null;
        if(\Illuminate\Support\Facades\Schema::hasTable('schools')){
            $q = School::query();
            $loads = [];
            if(\Illuminate\Support\Facades\Schema::hasTable('vendors')) $loads[] = 'vendors';
            if(\Illuminate\Support\Facades\Schema::hasTable('users')) $loads[] = 'user';
            if($loads) $q = $q->with($loads);
            $s = $q->find($id);
        }
        if($s) return $s;

        $row = null;
        if(\Illuminate\Support\Facades\Schema::hasTable('school_new')){
            $row = \DB::table('school_new')->where('id', $id)->first();
        }
        if($row){
            $data = (array) $row;
            // Attach the onboarding record (if this directory entry has registered)
            // so the admin profile view can show onboarding JSON + linked vendors.
            $onboarding = null;
            if(\Illuminate\Support\Facades\Schema::hasTable('schools')){
                $query = School::where('school_code', $row->school_code);
                if(\Illuminate\Support\Facades\Schema::hasTable('vendors')){
                    $query = $query->with('vendors');
                }
                $onboarding = $query->first();
            }
            $data['school'] = $onboarding ? $onboarding->toArray() : null;
            return response()->json($data);
        }

        abort(404);
    }

    /**
     * POST /admin/schools/{id}/review - Amazon-style application review.
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
            $approved?'Congratulations - you can now sign in and start using the school panel.'
                     :($s->review_notes),
            'onboarding');
        return response()->json(array_merge(['success' => true], $s->fresh()->only(['id','name','onboarding_status','reviewed_at','review_notes'])));
    }

    public function assign(Request $r){
        $d=$r->validate(['school_id'=>'required|exists:schools,id','vendor_id'=>'required|exists:vendors,id','royalty_percent'=>'required|numeric|min:0|max:100']);
        \DB::table('school_vendor')->updateOrInsert(['school_id'=>$d['school_id'],'vendor_id'=>$d['vendor_id']],['royalty_percent'=>$d['royalty_percent'],'is_active'=>1,'updated_at'=>now()]);
        $school=School::with('user')->find($d['school_id']);
        $vendor=Vendor::with('user')->find($d['vendor_id']);
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

    public function catIndex(){
        return Category::with('fields')->get();
    }

    public function catStore(Request $r){
        $d=$r->validate(['name'=>'required','slug'=>'required|unique:categories']);
        $d['slug']=Str::slug($d['slug']);
        return Category::create($d);
    }

    public function catUpdate(Request $r,$id){
        $c=Category::findOrFail($id);
        $c->update($r->only('name','description','is_active'));
        return $c;
    }

    public function catDestroy($id){
        Category::findOrFail($id)->delete();
        return response()->json(['deleted'=>true]);
    }

    public function fieldStore(Request $r){
        $d=$r->validate(['category_id'=>'required|exists:categories,id','field_name'=>'required','field_label'=>'required','field_type'=>'required','is_required'=>'boolean']);
        return CategoryField::create($d);
    }

    public function fieldUpdate(Request $r,$id){
        $f=CategoryField::findOrFail($id);
        $f->update($r->all());
        return $f;
    }

    public function fieldDestroy($id){
        CategoryField::findOrFail($id)->delete();
        return response()->json(['deleted'=>true]);
    }

    public function productIndex(Request $r){
        $q=Product::with('category','values','images');
        // ?search= powers the Home-content boost picker.
        if($r->search) $q->where('name','like','%'.$r->search.'%');
        return $q->paginate($r->per_page??20);
    }

    public function productStore(Request $r){
        return $this->saveProduct($r, 'admin', $r->user()->id);
    }

    public function productUpdate(Request $r,$id){
        $p=Product::findOrFail($id);
        $p->update($r->only('price','mrp','stock','is_active','delivery_mode'));
        return $p;
    }

    private function saveProduct(Request $r, $type, $id){
        $d=$r->validate(['category_id'=>'required|exists:categories,id','name'=>'required','price'=>'required|numeric','mrp'=>'nullable|numeric','stock'=>'integer','delivery_mode'=>'in:self,thirdparty,school_pickup','school_id'=>'nullable|exists:schools,id','vendor_id'=>'nullable|exists:vendors,id','fields'=>'array','payment_split'=>'array']);
        $p=Product::create($d+['created_by_type'=>$type,'created_by_id'=>$id]);
        foreach (($d['fields']??[]) as $fid=>$val) ProductValue::create(['product_id'=>$p->id,'field_id'=>$fid,'value_text'=>$val]);
        return response()->json($p->load('values'),201);
    }

    /** GET /admin/schools/stats - per-status counts for the school_new directory. */
    public function schoolStats(){
        $rows = \DB::table('school_new')->selectRaw('school_status, COUNT(*) c')->groupBy('school_status')->pluck('c','school_status');
        return response()->json([
            'total'    => array_sum($rows),
            'active'   => $rows['Active']  ?? 0,
            'inactive' => $rows['Inactive']?? 0,
            'deleted'  => $rows['Deleted'] ?? 0,
        ]);
    }
}
