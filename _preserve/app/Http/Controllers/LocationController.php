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
}
