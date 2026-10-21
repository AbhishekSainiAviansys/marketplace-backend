<?php
namespace App\Http\Controllers;
use App\Models\School;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * School / educational institute onboarding (Amazon-style application).
 *
 * The wizard at /school/onboarding runs in two phases:
 *   1. Step 1 posts auth/register (public) and receives a token.
 *   2. Steps 2-5 autosave the draft here and finally POST /school/onboarding/submit,
 *      which flips status to "submitted" and notifies admins.
 * Login stays locked until an admin approves (see AuthController::login).
 * Pending applicants resume via the public POST /onboarding/resume endpoint
 * so a closed browser doesn't strand their draft.
 */
class SchoolOnboardingController extends Controller {

    /** GET /school/onboarding — current application state for the wizard. */
    public function show(Request $r){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        return response()->json($this->payload($s));
    }

    /** PUT /school/onboarding — lenient draft autosave (any step). */
    public function save(Request $r){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $d = $r->validate(['data'=>'required|array']);
        // A rejected application goes back to draft on edit; the notes stay
        // visible so the applicant can see WHY while fixing things.
        $status = $s->onboarding_status==='submitted' ? 'submitted' : 'draft';
        $s->update(['onboarding'=>$d['data'],'onboarding_status'=>$status]);
        return response()->json($this->payload($s));
    }

    /** POST /school/onboarding/submit — strict validation, notifies admins. */
    public function submit(Request $r){
        $s = $r->user()->school;
        if(!$s) return response()->json(['message'=>'No school profile'],404);
        $d = $r->validate([
            'data'=>'required|array',
            // Core institution details expected for a school / coaching centre / institute.
            'data.institution.name'=>'required|string|max:200',
            'data.institution.type'=>'required|string|max:60',
            'data.institution.board'=>'required|string|max:60',
            'data.institution.registration_number'=>'required|string|max:60',
            'data.institution.address'=>'required|string|max:500',
            'data.contact.person_name'=>'required|string|max:200',
            'data.contact.designation'=>'required|string|max:100',
            'data.contact.contact_phone'=>'required|string|max:15',
            'data.classes'=>'required|array|min:1',
            'data.agreement'=>'accepted',
        ]);
        $s->update([
            'onboarding'=>$d['data'],
            'onboarding_status'=>'submitted',
            'submitted_at'=>now(),
            'review_notes'=>null,
        ]);
        if($s->gst===null && !empty($d['data']['institution']['gstin']))
            $s->update(['gst'=>$d['data']['institution']['gstin']]);
        NotificationController::pushRole('admin','School application submitted',
            $s->name.' submitted an onboarding application for review','onboarding');
        return response()->json($this->payload($s));
    }

    private function payload(School $s): array {
        return [
            'status'=>$s->onboarding_status,
            'data'=>$s->onboarding ?? [],
            'submitted_at'=>$s->submitted_at,
            'reviewed_at'=>$s->reviewed_at,
            'review_notes'=>$s->review_notes,
            'institution_name'=>$s->name,
        ];
    }
}