<?php
namespace App\Http\Controllers;
use App\Models\Product;
use App\Models\ProductValue;
use App\Models\InstituteCourse;
use App\Models\TutorEducation;
use App\Models\InstitutePortfolio;
use Illuminate\Http\Request;

class SchoolController extends Controller {
    use InsightsTrait;
    public function dashboard(Request $r){ $s=$r->user()->school; if(!$s) return response()->json(['message'=>'No school profile'],404); return response()->json(['school'=>$s,'vendors_count'=>$s->vendors()->count(),'products_count'=>Product::where('school_id',$s->id)->count(), ...$this->buildInsightsSummary($r,'school',$s->id)]); }
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

    /* -------------------------------------------------------------------
     *  Detail tables: courses, tutor education, portfolio (website / PDF)
     * ------------------------------------------------------------------- */

    /** GET /school/details — profile + courses + education + portfolio. */
    public function details(Request $r){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $type = 'school'; $id = $s->id;
        return response()->json([
            'profile' => $s->profile,
            'courses' => InstituteCourse::where('institute_type',$type)->where('institute_id',$id)->get(),
            'education' => TutorEducation::where('institute_type',$type)->where('institute_id',$id)->get(),
            'portfolio' => InstitutePortfolio::where('institute_type',$type)->where('institute_id',$id)->get(),
        ]);
    }

    /** PUT /school/details — upsert profile + bulk-replace courses / education / portfolio. */
    public function updateDetails(Request $r){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $d = $r->validate([
            'profile'=>'sometimes|array',
            'profile.website'=>'sometimes|nullable|string|max:500',
            'profile.logo_url'=>'sometimes|nullable|string|max:500',
            'profile.banner_url'=>'sometimes|nullable|string|max:500',
            'profile.contact_person'=>'sometimes|nullable|string|max:200',
            'profile.contact_phone'=>'sometimes|nullable|string|max:20',
            'profile.contact_email'=>'sometimes|nullable|email|max:190',
            'profile.detailed_address'=>'sometimes|nullable|string|max:1000',
            'profile.country_id'=>'sometimes|nullable|integer|exists:countries,country_id',
            'profile.state_id'=>'sometimes|nullable|string|max:32|exists:states,state_subdivision_id',
            'profile.district_id'=>'sometimes|nullable|integer|exists:districts,id',
            'profile.established_year'=>'sometimes|nullable|string|max:10',
            'profile.registration_number'=>'sometimes|nullable|string|max:100',
            'profile.board_affiliation'=>'sometimes|nullable|string|max:100',
            'profile.recognition_status'=>'sometimes|nullable|string|max:50',
            'profile.medium_of_instruction'=>'sometimes|nullable|string|max:100',
            'profile.student_strength'=>'sometimes|nullable|string|max:20',
            'profile.streams'=>'sometimes|nullable|array',
            'profile.classes'=>'sometimes|nullable|array',
            'courses'=>'sometimes|array',
            'courses.*.name'=>'required|string|max:200',
            'courses.*.subject'=>'nullable|string|max:100',
            'courses.*.level'=>'nullable|string|max:100',
            'courses.*.batch'=>'nullable|string|max:100',
            'courses.*.duration'=>'nullable|string|max:50',
            'courses.*.fee_range'=>'nullable|string|max:100',
            'courses.*.description'=>'nullable|string|max:500',
            'education'=>'sometimes|array',
            'education.*.degree'=>'required|string|max:200',
            'education.*.university'=>'nullable|string|max:200',
            'education.*.year'=>'nullable|string|max:10',
            'education.*.specialization'=>'nullable|string|max:200',
            'education.*.description'=>'nullable|string|max:500',
            'portfolio'=>'sometimes|array',
            'portfolio.*.kind'=>'required|in:website,pdf,image',
            'portfolio.*.label'=>'nullable|string|max:200',
            'portfolio.*.url'=>'nullable|string|max:500',
        ]);
        $type = 'school'; $id = $s->id;
        if(isset($d['profile'])){
            $s->profile()->updateOrCreate(['institute_type'=>$type,'institute_id'=>$id],$d['profile']);
        }
        if(isset($d['courses'])){
            InstituteCourse::where('institute_type',$type)->where('institute_id',$id)->delete();
            foreach($d['courses'] as $row) InstituteCourse::create(['institute_type'=>$type,'institute_id'=>$id,...$row]);
        }
        if(isset($d['education'])){
            TutorEducation::where('institute_type',$type)->where('institute_id',$id)->delete();
            foreach($d['education'] as $row) TutorEducation::create(['institute_type'=>$type,'institute_id'=>$id,...$row]);
        }
        if(isset($d['portfolio'])){
            InstitutePortfolio::where('institute_type',$type)->where('institute_id',$id)->delete();
            foreach($d['portfolio'] as $row) InstitutePortfolio::create(['institute_type'=>$type,'institute_id'=>$id,...$row]);
        }
        return $this->details($r);
    }

    /* Granular per-row APIs — same ownership guard (institute_type='school'). */

    public function courseStore(Request $r){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $d = $r->validate([
            'name'=>'required|string|max:200','subject'=>'nullable|string|max:100',
            'level'=>'nullable|string|max:100','batch'=>'nullable|string|max:100',
            'duration'=>'nullable|string|max:50','fee_range'=>'nullable|string|max:100',
            'description'=>'nullable|string|max:500',
        ]);
        return response()->json(
            InstituteCourse::create(['institute_type'=>'school','institute_id'=>$s->id,...$d]), 201);
    }

    public function courseUpdate(Request $r, int $id){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $row = InstituteCourse::where('institute_type','school')->where('institute_id',$s->id)->find($id);
        if(!$row) return response()->json(['message'=>'Course not found'],404);
        $row->update($r->validate([
            'name'=>'sometimes|required|string|max:200','subject'=>'nullable|string|max:100',
            'level'=>'nullable|string|max:100','batch'=>'nullable|string|max:100',
            'duration'=>'nullable|string|max:50','fee_range'=>'nullable|string|max:100',
            'description'=>'nullable|string|max:500',
        ]));
        return response()->json($row);
    }

    public function courseDestroy(Request $r, int $id){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $row = InstituteCourse::where('institute_type','school')->where('institute_id',$s->id)->find($id);
        if(!$row) return response()->json(['message'=>'Course not found'],404);
        $row->delete();
        return response()->json(['deleted'=>true]);
    }

    public function educationStore(Request $r){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $d = $r->validate([
            'degree'=>'required|string|max:200','university'=>'nullable|string|max:200',
            'year'=>'nullable|string|max:10','specialization'=>'nullable|string|max:200',
            'description'=>'nullable|string|max:500',
        ]);
        return response()->json(
            TutorEducation::create(['institute_type'=>'school','institute_id'=>$s->id,...$d]), 201);
    }

    public function educationUpdate(Request $r, int $id){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $row = TutorEducation::where('institute_type','school')->where('institute_id',$s->id)->find($id);
        if(!$row) return response()->json(['message'=>'Education record not found'],404);
        $row->update($r->validate([
            'degree'=>'sometimes|required|string|max:200','university'=>'nullable|string|max:200',
            'year'=>'nullable|string|max:10','specialization'=>'nullable|string|max:200',
            'description'=>'nullable|string|max:500',
        ]));
        return response()->json($row);
    }

    public function educationDestroy(Request $r, int $id){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $row = TutorEducation::where('institute_type','school')->where('institute_id',$s->id)->find($id);
        if(!$row) return response()->json(['message'=>'Education record not found'],404);
        $row->delete();
        return response()->json(['deleted'=>true]);
    }

    public function portfolioStore(Request $r){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $d = $r->validate([
            'kind'=>'required|in:website,pdf,image',
            'label'=>'nullable|string|max:200','url'=>'nullable|string|max:500',
        ]);
        return response()->json(
            InstitutePortfolio::create(['institute_type'=>'school','institute_id'=>$s->id,...$d]), 201);
    }

    public function portfolioUpdate(Request $r, int $id){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $row = InstitutePortfolio::where('institute_type','school')->where('institute_id',$s->id)->find($id);
        if(!$row) return response()->json(['message'=>'Portfolio item not found'],404);
        $row->update($r->validate([
            'kind'=>'sometimes|required|in:website,pdf,image',
            'label'=>'nullable|string|max:200','url'=>'nullable|string|max:500',
        ]));
        return response()->json($row);
    }

    public function portfolioDestroy(Request $r, int $id){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $row = InstitutePortfolio::where('institute_type','school')->where('institute_id',$s->id)->find($id);
        if(!$row) return response()->json(['message'=>'Portfolio item not found'],404);
        $row->delete();
        return response()->json(['deleted'=>true]);
    }

    /** POST /school/portfolio/upload — upload a PDF brochure or image. */
    public function portfolioUpload(Request $r){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $r->validate([
            'file'=>'required|file|max:10240|mimes:pdf,jpg,jpeg,png,webp',
            'label'=>'nullable|string|max:200',
        ]);
        $ext = strtolower($r->file('file')->getClientOriginalExtension());
        $kind = $ext === 'pdf' ? 'pdf' : 'image';
        $path = $r->file('file')->store('portfolio','public');
        $row = InstitutePortfolio::create([
            'institute_type'=>'school','institute_id'=>$s->id,
            'kind'=>$kind,'label'=>$r->input('label'),'url'=>'/storage/'.$path,
        ]);
        return response()->json($row, 201);
    }

    /** POST /school/branding/upload — upload the school logo or banner.
     *  See CoachingController::brandingUpload for the storage layout. */
    public function brandingUpload(Request $r){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $d = $r->validate([
            'type'=>'required|in:logo,banner',
            'file'=>'required|image|max:4096',
        ]);
        $folder = $d['type'] === 'logo' ? 'branding/logos' : 'branding/banners';
        $path = $r->file('file')->store($folder,'public');
        $url = '/storage/'.$path;
        $s->profile()->updateOrCreate(
            ['institute_type'=>'school','institute_id'=>$s->id],
            [$d['type'].'_url'=>$url]
        );
        return response()->json(['type'=>$d['type'],'url'=>$url], 201);
    }

    /** DELETE /school/branding/{type} — remove the logo or banner. */
    public function brandingDestroy(Request $r, string $type){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        if(!in_array($type,['logo','banner'],true))
            return response()->json(['message'=>'Unknown branding type'],404);
        $s->profile()->updateOrCreate(
            ['institute_type'=>'school','institute_id'=>$s->id],
            [$type.'_url'=>null]
        );
        return response()->json(['deleted'=>true,'type'=>$type]);
    }

    /* ------------------------------------------------------------------
     *  Insights: search appearances + enquiries + admin messages.
     * ------------------------------------------------------------------ */

    /** GET /school/insights/summary?month=YYYY-MM */
    public function insightsSummary(Request $r){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        return response()->json($this->buildInsightsSummary($r,'school',$s->id));
    }

    /** GET /school/insights/views?date=YYYY-MM-DD */
    public function insightsViews(Request $r){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        return $this->fetchInsightsViews($r,'school',$s->id);
    }

    /** GET /school/enquiries */
    public function enquiries(Request $r){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        return $this->fetchInsightsEnquiries($r,'school',$s->id);
    }
}
