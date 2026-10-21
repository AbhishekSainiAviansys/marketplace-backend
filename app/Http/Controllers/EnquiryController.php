<?php
namespace App\Http\Controllers;

use App\Models\InstituteEnquiry;
use App\Models\InstituteView;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Student enquiries on a directory listing (public popup form).
 *
 *   POST /api/v1/enquiries  (logged-out OK, throttled)
 *   { institute_type: school|coaching, institute_id, name, contact,
 *     enquiry_for, source? }
 *
 * Logged-in students are identified via optional Sanctum auth (the route
 * lives outside auth:sanctum but reads a bearer token when present);
 * everyone else is stored as "Unknown". A notification is pushed to the
 * institute owner and the enquiry also counts as an appearance event.
 */
class EnquiryController extends Controller {

    /** POST /enquiries — save the popup form + notify the owner. */
    public function store(Request $r){
        $d = $r->validate([
            'institute_type'=>'required|in:school,coaching',
            'institute_id'=>'required|integer|min:1',
            'name'=>'required|string|max:200',
            'contact'=>'required|string|max:50',
            'enquiry_for'=>'required|string|max:500',
            'source'=>'nullable|in:directory,detail,home',
        ]);

        // Optional auth: bearer token present -> link the student, else Unknown.
        $viewer = null;
        try { $viewer = $r->user(); } catch (\Throwable $e) { $viewer = null; }

        // Resolve the owner (user_id) + viewer location names for the dashboard.
        $ownerId = null;
        if($d['institute_type']==='school'){
            $ownerId = DB::table('schools')->where('id',$d['institute_id'])->value('user_id');
        } else {
            $ownerId = DB::table('coaching_institutes')->where('id',$d['institute_id'])->value('user_id');
        }
        if(!$ownerId) return response()->json(['message'=>'Institute not found'],404);

        $loc = ['country_name'=>null,'state_name'=>null,'district_name'=>null];
        if($viewer){
            $loc = $this->viewerLocation($viewer);
        }

        $row = InstituteEnquiry::create([
            'institute_type'=>$d['institute_type'],
            'institute_id'=>$d['institute_id'],
            'student_user_id'=>$viewer?->id,
            'name'=>$viewer?->name ?? $d['name'],
            'contact'=>$d['contact'],
            'enquiry_for'=>$d['enquiry_for'],
            'country_name'=>$loc['country_name'],
            'state_name'=>$loc['state_name'],
            'district_name'=>$loc['district_name'],
            'source'=>$d['source'] ?? 'directory',
        ]);

        // Counts as an appearance event on the owner's calendar.
        InstituteView::create([
            'institute_type'=>$d['institute_type'],
            'institute_id'=>$d['institute_id'],
            'student_user_id'=>$viewer?->id,
            'event'=>'enquiry',
            'country_name'=>$loc['country_name'],
            'state_name'=>$loc['state_name'],
            'district_name'=>$loc['district_name'],
            'source'=>$d['source'] ?? 'directory',
        ]);

        NotificationController::push($ownerId,
            'New enquiry: '.($d['enquiry_for'] ? mb_substr($d['enquiry_for'],0,60) : 'admission'),
            ($viewer?->name ?? $d['name']).' ('.$d['contact'].') enquired for: '.$d['enquiry_for'],
            'enquiry');

        return response()->json(['saved'=>true,'id'=>$row->id], 201);
    }

    /** Best-effort location names for a logged-in viewer (by role). */
    private function viewerLocation($user): array {
        $out = ['country_name'=>null,'state_name'=>null,'district_name'=>null];
        try {
            $countryId = $stateId = $districtId = null;
            if($user->role==='school' && $user->school){
                $s = $user->school;
                $countryId = $s->profile->country_id ?? null;
                $stateId = $s->profile->state_id ?? null;
                $districtId = $s->profile->district_id ?? null;
            } elseif($user->role==='coaching' && $user->coachingInstitute){
                $c = $user->coachingInstitute;
                $countryId = $c->country_id; $stateId = $c->state_id; $districtId = $c->district_id;
            }
            if($countryId) $out['country_name'] = DB::table('countries')->where('country_id',(int)$countryId)->value('country_name');
            if($stateId) $out['state_name'] = DB::table('states')->where('state_subdivision_id',(string)$stateId)->value('state_subdivision_name');
            if($districtId) $out['district_name'] = DB::table('districts')->where('id',(int)$districtId)->value('district_name');
        } catch (\Throwable $e) { /* never fail the enquiry on location lookup */ }
        return $out;
    }
}
