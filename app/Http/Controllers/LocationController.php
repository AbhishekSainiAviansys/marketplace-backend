<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Dropdown chain on REAL tables:
// countries(country_id) -> states(country_id, PK state_subdivision_id varchar)
// -> districts(state_id = state_subdivision_id) -> areas(district_id, Active only)
// Label for area dropdown: city_name (area_code). Default country: India 105.
class LocationController extends Controller {
    public function countries(Request $r){
        $q=DB::table('countries')->select('country_id as id','country_name as name','country_code_char2 as iso2');
        if($s=$r->q) $q->where('country_name','like',"%$s%");
        return $q->orderByRaw('country_id=105 DESC')->orderBy('country_name')->limit($r->limit??250)->get();
    }
    public function states(Request $r){
        $q=DB::table('states')->select('state_subdivision_id as id','state_subdivision_name as name','state_subdivision_code as code','country_id');
        if($r->country_id) $q->where('country_id',$r->country_id);
        if($s=$r->q) $q->where('state_subdivision_name','like',"%$s%");
        return $q->orderBy('state_subdivision_name')->limit($r->limit??500)->get();
    }
    public function districts(Request $r){
        $r->validate(['state_id'=>'required']);
        // districts.state_id is the states PK (varchar like 14680); districts.country_id is 0/unreliable so ignored
        $q=DB::table('districts')->select('id','district_name as name','state_id','country_id')
            ->where('state_id',$r->state_id);
        if($s=$r->q) $q->where('district_name','like',"%$s%");
        return $q->orderBy('district_name')->limit($r->limit??500)->get();
    }
    public function areas(Request $r){
        $r->validate(['district_id'=>'required']);
        $q=DB::table('areas')->select('id','area_code','city_name as label','district_id','state_id','country_id','status')
            ->where('district_id',$r->district_id)->where('status','Active');
        if($s=$r->q) $q->where(function($x) use ($s){ $x->where('city_name','like',"%$s%")->orWhere('area_code','like',"%$s%"); });
        return $q->orderBy('city_name')->limit($r->limit??500)->get()
            ->map(fn($a)=>['id'=>$a->id,'label'=>$a->label.' ('.$a->area_code.')','area_code'=>$a->area_code,'district_id'=>$a->district_id]);
    }
    public function phonecodes(){
        return DB::table('country_phonecodes')->orderByDesc('is_default')->orderBy('country_name')->get();
    }
    public function schools(Request $r){
        $d=$r->validate([
            'q'=>'nullable|string|max:100',
            'country_id'=>'nullable|integer',
            'state_id'=>'nullable|string|max:32',
            'district_id'=>'nullable|integer',
            'limit'=>'nullable|integer|min:1|max:100',
        ]);
        $q=DB::table('school_new')
            ->select('id','school_name as name','school_code','country','state','district','city')
            ->where('school_status','Active')
            ->whereNotExists(function($sub){
                $sub->selectRaw('1')->from('schools')
                    ->whereColumn('schools.school_code','school_new.school_code');
            });
        if(!empty($d['country_id'])) $q->where('country',$d['country_id']);
        if(!empty($d['state_id'])){
            $state=DB::table('states')->where('state_subdivision_id',$d['state_id'])->value('state_subdivision_name');
            if(!$state) return response()->json([]);
            $q->where('state',$state);
        }
        // if(!empty($d['district_id'])){
        //     $district=DB::table('districts')->where('id',$d['district_id'])->value('district_name');
        //     if(!$district) return response()->json([]);
        //     $q->where('district',$district);
        // }
        if(!empty($d['q'])){
            $term=trim($d['q']);
            $q->where(function($x) use ($term){
                $x->where('school_name','like','%'.$term.'%')->orWhere('school_code','like','%'.$term.'%');
            });
        }
        return $q->orderBy('school_name')->limit($d['limit']??100)->get();
    }
}
