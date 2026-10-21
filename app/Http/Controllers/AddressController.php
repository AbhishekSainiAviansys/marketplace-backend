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
            'id'=>'nullable|integer',
            'label'=>'nullable','line1'=>'nullable','line2'=>'nullable',
            'country_id'=>'nullable|integer|exists:countries,country_id',
            'state_id'=>'nullable|string|exists:states,state_subdivision_id',
            'district_id'=>'nullable|integer|exists:districts,id',
            'area_id'=>'nullable|integer|exists:areas,id',
            'pincode'=>'required','phone_code'=>'nullable|string|max:8',
            'phone'=>'nullable|string|max:15','is_default'=>'boolean',
        ]);
        $userId = $r->user()->id;
        $d['user_id']=$userId;
        if (isset($d['line1']) && trim((string)$d['line1']) === '') $d['line1'] = null;
        if(!empty($d['is_default'])) Address::where('user_id',$userId)->update(['is_default'=>0]);

        $existing = null;
        if (!empty($d['id'])) {
            $existing = Address::where('user_id',$userId)->find($d['id']);
        }
        if (!$existing) {
            $existing = Address::where('user_id',$userId)->first();
        }

        $id = null;
        if ($existing) {
            $id = $existing->id;
            unset($d['id']);
            $existing->update($d);
        } else {
            unset($d['id']);
            $created = Address::create($d);
            $id = $created->id;
        }

        return Address::where('addresses.id',$id)
            ->leftJoin('countries as c','c.country_id','=','addresses.country_id')
            ->leftJoin('states as s','s.state_subdivision_id','=','addresses.state_id')
            ->leftJoin('districts as d','d.id','=','addresses.district_id')
            ->leftJoin('areas as a','a.id','=','addresses.area_id')
            ->select('addresses.*','c.country_name','s.state_subdivision_name as state_name','d.district_name','a.city_name as area_label','a.area_code')
            ->first();
    }
    public function destroy(Request $r,$id){ Address::where('user_id',$r->user()->id)->findOrFail($id)->delete(); return response()->json(['deleted'=>true]); }
}
