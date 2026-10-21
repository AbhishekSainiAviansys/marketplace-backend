<?php
namespace App\Http\Controllers;
use App\Models\User;
use App\Models\Vendor;
use App\Models\School;
use App\Models\CoachingInstitute;
use App\Models\Otp;
use App\Models\Setting;
use App\Mail\OtpMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AuthController extends Controller {
    public function register(Request $r) {
        $d = $r->validate([
            'name'=>'required|string|max:150',
            'email'=>'nullable|email|unique:users,email',
            'phone_country_code'=>'nullable|string|max:8',
            'whatsapp'=>'nullable|string|max:15',
            'password'=>'required|min:6',
            'role'=>'required|in:vendor,school,coaching',
            'shop_name'=>'required_if:role,vendor',
            'school_code'=>'nullable|string|unique:schools',
            'school_name'=>'required_if:role,school',
            // Coaching centre / private tutor institute (/coaching/register).
            // Per-type details: coaching = centre + batches; institute = team +
            // registration; tutor = individual + subjects/qualification.
            //
            // NOTE: the coaching-only rules MUST stay conditional on
            // role=coaching. A flat "required_unless:institute_type,
            // private_tutor" leaked into vendor/school signups: they never send
            // institute_type, so the rule fired and every vendor/school
            // registration died with 422 "The address field is required...".
            'institute_name'=>'required_if:role,coaching|string|max:200',
            'institute_type'=>'required_if:role,coaching|in:private_coaching,private_institute,private_tutor',
            'address'=>Rule::when(
                fn() => $r->input('role') === 'coaching',
                ['nullable','string','max:500','required_unless:institute_type,private_tutor'],
                ['nullable','string','max:500'],
            ),
            'home_tuition'=>'nullable|boolean',
            'country_id'=>'required_if:role,coaching|integer|exists:countries,country_id',
            'state_id'=>'required_if:role,coaching|string|max:32|exists:states,state_subdivision_id',
            'district_id'=>'required_if:role,coaching|integer|exists:districts,id',
            // Private coaching centre extras.
            'batch_size'=>'nullable|string|max:50',
            'classrooms'=>'nullable|string|max:50',
            'courses_offered'=>'nullable|string|max:500',
            // Private institute extras (team of tutors, registered body).
            'established_year'=>'nullable|string|max:10',
            'registration_number'=>'nullable|string|max:100',
            'director_name'=>'nullable|string|max:150',
            'faculty_count'=>'nullable|string|max:20',
            // Private tutor extras (individual).
            'tutor_subjects'=>'nullable|string|max:500',
            'experience_years'=>'nullable|string|max:20',
            'qualification'=>'nullable|string|max:200',
            'fee_per_hour'=>'nullable|string|max:50',
            'address_id'=>'nullable|exists:addresses,id',
        ]);
        $code = $d['phone_country_code'] ?? '+91';
        $digits = preg_replace('/\D/','',$d['whatsapp']??'');
        $whatsapp = $digits?:null;
        $email = $d['email']??null;

        // Duplicate guard: a user with this whatsapp or email may already exist
        // (e.g. re-registering a coaching institute after a session expiry).
        //
        // NOTE: only compare the fields that were actually supplied. A flat
        // "orWhere('email', $email ?? null)" compiled to "email = NULL", which
        // is never true in SQL — so it did NOT block duplicates. Worse, the
        // OR branch made the whole query match ANY user with a NULL email, so
        // the first email-less signup permanently blocked every later signup
        // with 409 "account already exists".
        $existing = User::where(function($w) use ($whatsapp,$email){
            if($whatsapp !== null) $w->orWhere('whatsapp',$whatsapp);
            if($email    !== null) $w->orWhere('email',$email);
        })->first();
        if($existing) {
            return response()->json([
                'message'=>'An account with this WhatsApp number or email already exists.',
                'code'=>'account_exists',
                'user'=>['id'=>$existing->id,'name'=>$existing->name,'role'=>$existing->role],
            ], 409);
        }

        $user = User::create([
            'name'=>$d['name'],'email'=>$email,'whatsapp'=>$whatsapp,
            'phone_country_code'=>$code,'phone_e164'=>$whatsapp?$code.$digits:null,
            'password'=>Hash::make($d['password']),'role'=>$d['role'],
        ]);
        if ($d['role']==='vendor') Vendor::create(['user_id'=>$user->id,'shop_name'=>$d['shop_name'],'address_id'=>$d['address_id']??null,
            // Amazon-style: self-registered sellers start as a draft application
            // and stay locked out of login until an admin approves them.
            'onboarding_status'=>'draft','onboarding'=>[]]);
        else if ($d['role']==='school') {
            $schoolCode = !empty($d['school_code']) ? $d['school_code'] : 'SCH-'.Str::upper(Str::random(6));
            $school = School::create(['user_id'=>$user->id,'school_code'=>$schoolCode,'name'=>$d['school_name'],'address_id'=>$d['address_id']??null,
                // Self-registered schools start as a draft application and stay
                // locked out of login until an admin approves them.
                'onboarding_status'=>'draft','onboarding'=>[]]);
            NotificationController::pushRole('admin','New school application','A new school ("'.$d['school_name'].'") signed up and needs review','onboarding');
            // Public details stored in institute_profiles for directory filtering.
            $school->profile()->updateOrCreate(
                ['institute_type'=>'school','institute_id'=>$school->id],
                ['website'=>$d['website']??null,'contact_person'=>$d['contact_person']??null,
                 'contact_phone'=>$d['contact_phone']??null,'contact_email'=>$d['contact_email']??null,
                 'detailed_address'=>$d['detailed_address']??$d['address']??null,
                 'country_id'=>$d['country_id']??null,'state_id'=>$d['state_id']??null,'district_id'=>$d['district_id']??null,
                 'established_year'=>$d['established_year']??null,'registration_number'=>$d['registration_number']??null,
                 'board_affiliation'=>$d['board_affiliation']??null,'recognition_status'=>$d['recognition_status']??null,
                 'medium_of_instruction'=>$d['medium_of_instruction']??null,'student_strength'=>$d['student_strength']??null,
                 'streams'=>$d['streams']??null,'classes'=>$d['classes']??null]
            );
        } else {
            // Coaching centre / private tutor institute - instant activation.
            // Per-type hard requirements (beyond the lenient nullable rules):
            //  tutor needs subjects; institute needs registration; coaching
            //  centre needs a street address.
            $itype = $d['institute_type'];
            if($itype==='private_tutor' && empty($d['tutor_subjects'])){
                return response()->json(['message'=>'Subjects are required for a private tutor',
                    'errors'=>['tutor_subjects'=>['Subjects are required for a private tutor']]],422);
            }
            if($itype==='private_institute' && empty($d['registration_number'])){
                return response()->json(['message'=>'Registration number is required for a private institute',
                    'errors'=>['registration_number'=>['Registration number is required for a private institute']]],422);
            }
            if($itype==='private_coaching' && empty($d['address'])){
                return response()->json(['message'=>'Centre address is required for a private coaching centre',
                    'errors'=>['address'=>['Centre address is required for a private coaching centre']]],422);
            }
            $code = 'COA-'.Str::upper(Str::random(6));
            // Per-type detail bag stored in the onboarding JSON (no schema change).
            $typeDetails = match($itype){
                'private_coaching' => ['batch_size'=>$d['batch_size']??null,
                    'classrooms'=>$d['classrooms']??null,'courses_offered'=>$d['courses_offered']??null],
                'private_institute' => ['established_year'=>$d['established_year']??null,
                    'registration_number'=>$d['registration_number']??null,
                    'director_name'=>$d['director_name']??null,'faculty_count'=>$d['faculty_count']??null],
                'private_tutor' => ['subjects'=>$d['tutor_subjects']??null,
                    'experience_years'=>$d['experience_years']??null,
                    'qualification'=>$d['qualification']??null,'fee_per_hour'=>$d['fee_per_hour']??null,
                    'home_tuition'=>(bool)($d['home_tuition']??false)],
                default => [],
            };
            $institute = CoachingInstitute::create([
                'user_id'=>$user->id,'institute_code'=>$code,
                'name'=>$d['institute_name'],'institute_type'=>$itype,
                'address'=>$d['address']??null,'country_id'=>$d['country_id'],
                'state_id'=>$d['state_id'],'district_id'=>$d['district_id'],
                'onboarding_status'=>'approved','submitted_at'=>now(),
                'onboarding'=>[
                    'institute'=>['name'=>$d['institute_name'],'type'=>$itype,'details'=>$typeDetails],
                    'contact'=>['person_name'=>$d['name'],'email'=>$d['email']??null,
                        'phone'=>trim(($d['phone_country_code']??'+91').$digits)],
                ],
            ]);
            NotificationController::pushRole('admin','New coaching institute','"'.$d['institute_name'].'" registered a coaching panel','onboarding');
            // Public details stored in institute_profiles for directory filtering.
            $institute->profile()->updateOrCreate(
                ['institute_type'=>'coaching','institute_id'=>$institute->id],
                ['website'=>$d['website']??null,'contact_person'=>$d['contact_person']??null,
                 'contact_phone'=>$d['contact_phone']??null,'contact_email'=>$d['contact_email']??null,
                 'detailed_address'=>$d['detailed_address']??$d['address']??null,
                 'country_id'=>$d['country_id'],'state_id'=>$d['state_id'],'district_id'=>$d['district_id'],
                 'established_year'=>$d['established_year']??null,'registration_number'=>$d['registration_number']??null,
                 'board_affiliation'=>$d['board_affiliation']??null,'recognition_status'=>$d['recognition_status']??null,
                 'medium_of_instruction'=>$d['medium_of_instruction']??null,'student_strength'=>$d['student_strength']??null,
                 'streams'=>$d['streams']??null,'classes'=>$d['classes']??null]
            );
        }
        NotificationController::push($user->id,'Welcome to Marketplace','Your '.$d['role'].' account was created','welcome');
        if ($d['role']==='vendor') NotificationController::pushRole('admin','New vendor application','A new seller ("'.$d['shop_name'].'") signed up and needs review','onboarding');
        $token = $user->createToken('api')->plainTextToken;
        $vendor = $d['role']==='vendor' ? $user->vendor()->first() : null;
        $school = $d['role']==='school' ? $user->school()->first() : null;
        $coaching = $d['role']==='coaching' ? $user->coachingInstitute()->first() : null;
        $profile = $vendor ?: ($school ?: $coaching);
        return response()->json(['token'=>$token,'user'=>$user,
            'onboarding'=>($profile ? ['status'=>$profile->onboarding_status] : null)], 201);
    }
    public function login(Request $r) {
        $r->validate(['login'=>'required','password'=>'required']);
        $user = User::where('email',$r->login)->orWhere('whatsapp',$r->login)->first();
        if (!$user || !Hash::check($r->password, $user->password) || !$user->is_active)
            return response()->json(['message'=>'Invalid credentials'], 401);
        // Amazon-style gate: a vendor whose application isn't approved yet gets a
        // clear reason instead of a misleading "invalid credentials" — their
        // password is fine, they just can't sell yet. They resume the
        // application at /sell (POST onboarding/resume) instead.
        if ($user->role==='vendor' && $user->vendor && !$user->vendor->isApproved()) {
            $v = $user->vendor;
            $msg = match ($v->onboarding_status) {
                'rejected' => 'Application needs changes — review the feedback and resubmit',
                'submitted' => 'Application under review — we\'ll notify you once it\'s approved',
                default => 'Finish your seller application to start selling',
            };
            return response()->json(['message'=>$msg,'code'=>'onboarding_'.$v->onboarding_status,
                'notes'=>$v->review_notes,'onboarding'=>['status'=>$v->onboarding_status]], 403);
        }
        // Same gate for schools: a school whose application isn't approved yet
        // cannot use the school panel until an admin approves.
        if ($user->role==='school' && $user->school && !$user->school->isApproved()) {
            $s = $user->school;
            $msg = match ($s->onboarding_status) {
                'rejected' => 'Application needs changes — review the feedback and resubmit',
                'submitted' => 'Application under review — we\'ll notify you once it\'s approved',
                default => 'Finish your school application to start using the school panel',
            };
            return response()->json(['message'=>$msg,'code'=>'onboarding_'.$s->onboarding_status,
                'notes'=>$s->review_notes,'onboarding'=>['status'=>$s->onboarding_status]], 403);
        }
        // Coaching panel gate: instant activation today, but a flipped status
        // behaves exactly like the school/vendor gates above.
        if ($user->role==='coaching' && $user->coachingInstitute && !$user->coachingInstitute->isApproved()) {
            $c = $user->coachingInstitute;
            $msg = match ($c->onboarding_status) {
                'rejected' => 'Application needs changes - review the feedback and resubmit',
                'submitted' => 'Application under review - we will notify you once it is approved',
                default => 'Your coaching institute application is not active yet',
            };
            return response()->json(['message'=>$msg,'code'=>'onboarding_'.$c->onboarding_status,
                'notes'=>$c->review_notes,'onboarding'=>['status'=>$c->onboarding_status]], 403);
        }
        return response()->json(['token'=>$user->createToken('api')->plainTextToken,'user'=>$user]);
    }
    public function logout(Request $r){ $r->user()->currentAccessToken()->delete(); return response()->json(['message'=>'Logged out']); }
    public function me(Request $r) {
        $user = $r->user();
        // Load only the profile relationship matching the user's role so a
        // coaching user never queries school_new (which may lack user_id) and
        // a school user never queries coaching_institutes.
        $load = match($user->role) {
            'vendor' => ['vendor'],
            'school' => ['school'],
            'coaching' => ['coachingInstitute'],
            default => [],
        };
        if ($load) $user->load($load);
        return response()->json($user);
    }

    // OTP via real mail (Mailpit default) + DB record + notification
    public function otpSend(Request $r){
        $d=$r->validate(['identifier'=>'required|string']);
        $otp=(string)rand(100000,999999);
        $mins=(int)Setting::getVal('otp_expiry_min',10);
        $rec=Otp::create(['identifier'=>$d['identifier'],'otp'=>$otp,'expires_at'=>now()->addMinutes($mins)]);
        if(filter_var($d['identifier'],FILTER_VALIDATE_EMAIL)){
            try { Mail::to($d['identifier'])->send(new OtpMail($otp)); $mail='sent via '.config('mail.default'); }
            catch(\Exception $e){ \Log::error('OTP mail fail: '.$e->getMessage()); $mail='mail_failed: '.$e->getMessage(); }
        } else { \Log::info('OTP whatsapp '.$d['identifier'].': '.$otp); $mail='whatsapp-logged (no SMS provider yet)'; }
        $u=User::where('email',$d['identifier'])->orWhere('whatsapp',$d['identifier'])->first();
        if($u) NotificationController::push($u->id,'OTP sent','OTP valid '.$mins.' min','otp');
        $out=['otp_id'=>$rec->id,'expires_in_min'=>$mins,'mail'=>$mail];
        if(config('app.debug')) $out['otp_debug']=$otp; // visible locally/Mailpit; remove in prod
        return response()->json($out);
    }
    public function otpVerify(Request $r){
        $d=$r->validate(['otp_id'=>'required|exists:otps,id','otp'=>'required']);
        $rec=Otp::findOrFail($d['otp_id']);
        if($rec->is_verified) return response()->json(['verified'=>true,'note'=>'already verified']);
        if(now()->gt($rec->expires_at)) return response()->json(['message'=>'OTP expired'],422);
        if($rec->otp!==$d['otp']){ $rec->increment('attempts'); return response()->json(['message'=>'Invalid OTP'],422); }
        $rec->update(['is_verified'=>true]);
        return response()->json(['verified'=>true]);
    }
}

