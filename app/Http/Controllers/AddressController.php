<?php
namespace App\Http\Controllers;
use App\Models\Address;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class AddressController extends Controller {
    private function selectColumns(): array {
        $cols = ['addresses.*'];
        if (Schema::hasTable('countries')) $cols[] = 'c.country_name';
        if (Schema::hasTable('states')) $cols[] = 's.state_subdivision_name as state_name';
        if (Schema::hasTable('districts')) $cols[] = 'd.district_name';
        if (Schema::hasTable('areas')) $cols[] = 'a.city_name as area_label';
        if (Schema::hasTable('areas')) $cols[] = 'a.area_code';
        return $cols;
    }

    private function withLocations($q) {
        if (Schema::hasTable('countries')) $q->leftJoin('countries as c', 'c.country_id', '=', 'addresses.country_id');
        if (Schema::hasTable('states')) $q->leftJoin('states as s', 's.state_subdivision_id', '=', 'addresses.state_id');
        if (Schema::hasTable('districts')) $q->leftJoin('districts as d', 'd.id', '=', 'addresses.district_id');
        if (Schema::hasTable('areas')) $q->leftJoin('areas as a', 'a.id', '=', 'addresses.area_id');
        return $q;
    }

    public function index(Request $r){
        $q = Address::where('user_id', $r->user()->id);
        $this->withLocations($q);
        return $q->select($this->selectColumns())->get();
    }

    public function store(Request $r){
        $d = $r->validate([
            'id' => 'nullable|integer',
            'label' => 'nullable', 'line1' => 'nullable', 'line2' => 'nullable',
            'city' => 'nullable', 'state' => 'nullable', 'country' => 'nullable',
            'country_id' => 'nullable|integer',
            'state_id' => 'nullable|string',
            'district_id' => 'nullable|integer',
            'area_id' => 'nullable|integer',
            'pincode' => 'required', 'phone_code' => 'nullable|string|max:8',
            'phone' => 'nullable|string|max:15', 'is_default' => 'boolean',
        ]);
        $userId = $r->user()->id;

        // Keep only columns that actually exist on the addresses table so the
        // endpoint works with both the real schema and minimal test schemas.
        $data = ['user_id' => $userId];
        foreach ($d as $key => $value) {
            if ($key === 'id') continue;
            if (Schema::hasColumn('addresses', $key)) {
                $data[$key] = $value;
            }
        }
        if (isset($data['line1']) && trim((string)$data['line1']) === '') $data['line1'] = null;
        if (!empty($data['is_default']) && Schema::hasColumn('addresses', 'is_default')) {
            Address::where('user_id', $userId)->update(['is_default' => 0]);
        }

        $existing = null;
        if (!empty($d['id']) && Schema::hasColumn('addresses', 'id')) {
            $existing = Address::where('user_id', $userId)->find($d['id']);
        }

        if ($existing) {
            unset($data['id']);
            $existing->update($data);
            $id = $existing->id;
            $status = 200;
        } else {
            unset($data['id']);
            $created = Address::create($data);
            $id = $created->id;
            $status = 201;
        }

        $q = Address::where('addresses.id', $id);
        $this->withLocations($q);
        $row = $q->select($this->selectColumns())->first();
        return response()->json($row, $status);
    }

    public function destroy(Request $r, $id) {
        Address::where('user_id', $r->user()->id)->findOrFail($id)->delete();
        return response()->json(['deleted' => true]);
    }
}
