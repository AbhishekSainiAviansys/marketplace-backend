<?php
namespace App\Http\Controllers;
use App\Models\User;
use App\Models\School;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * Vendor onboarding (Amazon-style application).
 *
 * The wizard at /sell runs in two phases:
 *   1. Step 1 posts auth/register (public) and receives a token.
 *   2. Steps 2-8 autosave the draft here and finally POST /onboarding/submit,
 *      which flips status to "submitted" and notifies admins.
 * Login stays locked until an admin approves (see AuthController::login).
 * Pending applicants resume via the public POST /onboarding/resume endpoint
 * so a closed browser doesn't strand their draft.
 */
class VendorOnboardingController extends Controller {

    /** GET /vendor/onboarding — current application state for the wizard. */
    public function show(Request $r){
        $v = $r->user()->vendor;
        if(!$v) return response()->json(['message'=>'No vendor profile'],404);
        return response()->json($this->payload($v));
    }

    /** PUT /vendor/onboarding — lenient draft autosave (any step). */
    public function save(Request $r){
        $v = $r->user()->vendor;
        if(!$v) return response()->json(['message'=>'No vendor profile'],404);
        $d = $r->validate(['data'=>'required|array']);
        // A rejected application goes back to draft on edit; the notes stay
        // visible so the applicant can see WHY while fixing things.
        $status = $v->onboarding_status==='submitted' ? 'submitted' : 'draft';
        $v->update(['onboarding'=>$d['data'],'onboarding_status'=>$status]);
        return response()->json($this->payload($v));
    }

    /** POST /vendor/onboarding/submit — strict validation, notifies admins. */
    public function submit(Request $r){
        $v = $r->user()->vendor;
        if(!$v) return response()->json(['message'=>'No vendor profile'],404);
        $d = $r->validate([
            'data'=>'required|array',
            // Amazon's required core: entity, tax id, bank, signatory, categories.
            'data.business.legal_name'=>'required|string|max:200',
            'data.business.business_type'=>'required|string|max:60',
            'data.business.address'=>'required|string|max:500',
            'data.tax.pan'=>'required|string|max:20',
            'data.bank.account_number'=>'required|string|max:30',
            'data.bank.ifsc'=>'required|string|max:20',
            'data.bank.holder_name'=>'required|string|max:200',
            'data.kyc.signatory_name'=>'required|string|max:200',
            'data.kyc.contact_phone'=>'required|string|max:15',
            'data.categories'=>'required|array|min:1',
            'data.agreement'=>'accepted',
        ]);
        $v->update([
            'onboarding'=>$d['data'],
            'onboarding_status'=>'submitted',
            'submitted_at'=>now(),
            'review_notes'=>null,
        ]);
        if($v->gst===null && !empty($d['data']['tax']['gstin']))
            $v->update(['gst'=>$d['data']['tax']['gstin']]);
        NotificationController::pushRole('admin','Vendor application submitted',
            $v->shop_name.' submitted an onboarding application for review','onboarding');
        return response()->json($this->payload($v));
    }

    /**
     * POST /onboarding/resume (public) — pending applicants re-enter the wizard
     * with email/whatsapp + password. Only works while the application is NOT
     * approved (approved sellers use normal login); returns a fresh token plus
     * the saved draft so the wizard can jump to the first incomplete step.
     */
    public function resume(Request $r){
        $d = $r->validate(['login'=>'required','password'=>'required']);
        $user = User::where('email',$d['login'])->orWhere('whatsapp',$d['login'])->first();
        if(!$user || !Hash::check($d['password'],$user->password) || !in_array($user->role,['vendor','school']))
            return response()->json(['message'=>'No pending application found for those details'],401);
        $profile = $user->role==='vendor' ? $user->vendor : $user->school;
        if(!$profile)
            return response()->json(['message'=>'No pending application found for those details'],401);
        if($profile->isApproved())
            return response()->json(['message'=>'This application is already approved — sign in normally'],403);
        return response()->json([
            'token'=>$user->createToken('api')->plainTextToken,
            'user'=>$user,
            'onboarding'=>$this->payload($profile),
        ]);
    }

    private function payload($profile): array {
        return [
            'status'=>$profile->onboarding_status,
            'data'=>$profile->onboarding ?? [],
            'submitted_at'=>$profile->submitted_at,
            'reviewed_at'=>$profile->reviewed_at,
            'review_notes'=>$profile->review_notes,
            'shop_name'=>$profile->shop_name ?? $profile->name ?? null,
        ];
    }
}
