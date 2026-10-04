<?php
namespace App\Http\Controllers;
use App\Models\Address;
use Illuminate\Http\Request;

class AddressController extends Controller {
    public function index(Request $r){
        return Address::where('user_id',$r->user()->id)
            ->leftJoin('countries as c','c.country_id','=','addresses.country_id')
            ->leftJoin('states as s','s.state_subdivision_id','=','addresses.state_id')
            ->leftJoin('districts as d','d.id','=','addresses.district_id')
            ->leftJoin('areas as a','a.id','=','addresses.area_id')
            ->select('addresses.*','c.country_name','s.state_subdivision_name as state_name','d.district_name','a.city_name as area_label','a.area_code')
            ->get();
    }
    public function store(Request $r){
        $d=$r->validate([
            'label'=>'nullable','line1'=>'required','line2'=>'nullable',
            'country_id'=>'nullable|integer|exists:countries,country_id',
            'state_id'=>'nullable|string|exists:states,state_subdivision_id',
            'district_id'=>'nullable|integer|exists:districts,id',
            'area_id'=>'nullable|integer|exists:areas,id',
            'pincode'=>'required','phone_code'=>'nullable|string|max:8',
            'phone'=>'nullable|string|max:15','is_default'=>'boolean',
        ]);
        $d['user_id']=$r->user()->id;
        if(!empty($d['is_default'])) Address::where('user_id',$r->user()->id)->update(['is_default'=>0]);
        return Address::create($d);
    }
    public function destroy(Request $r,$id){ Address::where('user_id',$r->user()->id)->findOrFail($id)->delete(); return response()->json(['deleted'=>true]); }
}
