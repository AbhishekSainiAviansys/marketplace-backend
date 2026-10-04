<?php
namespace App\Http\Controllers;
use App\Models\User;
use App\Models\Vendor;
use App\Models\School;
use App\Models\Otp;
use App\Models\Setting;
use App\Mail\OtpMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller {
    public function register(Request $r) {
        $d = $r->validate([
            'name'=>'required|string|max:150',
            'email'=>'nullable|email|unique:users,email',
            'phone_country_code'=>'nullable|string|max:8',
            'whatsapp'=>'nullable|string|max:15',
            'password'=>'required|min:6',
            'role'=>'required|in:vendor,school',
            'shop_name'=>'required_if:role,vendor',
            'school_code'=>'required_if:role,school',
            'school_name'=>'required_if:role,school',
            'address_id'=>'nullable|exists:addresses,id',
        ]);
        $code = $d['phone_country_code'] ?? '+91';
        $digits = preg_replace('/\D/','',$d['whatsapp']??'');
        $user = User::create([
            'name'=>$d['name'],'email'=>$d['email']??null,'whatsapp'=>$digits?:null,
            'phone_country_code'=>$code,'phone_e164'=>$digits?$code.$digits:null,
            'password'=>Hash::make($d['password']),'role'=>$d['role'],
        ]);
        if ($d['role']==='vendor') Vendor::create(['user_id'=>$user->id,'shop_name'=>$d['shop_name'],'address_id'=>$d['address_id']??null]);
        else School::create(['user_id'=>$user->id,'school_code'=>$d['school_code'],'name'=>$d['school_name'],'address_id'=>$d['address_id']??null]);
        NotificationController::push($user->id,'Welcome to Marketplace','Your '.$d['role'].' account was created','welcome');
        $token = $user->createToken('api')->plainTextToken;
        return response()->json(['token'=>$token,'user'=>$user], 201);
    }
    public function login(Request $r) {
        $r->validate(['login'=>'required','password'=>'required']);
        $user = User::where('email',$r->login)->orWhere('whatsapp',$r->login)->first();
        if (!$user || !Hash::check($r->password, $user->password) || !$user->is_active)
            return response()->json(['message'=>'Invalid credentials'], 401);
        return response()->json(['token'=>$user->createToken('api')->plainTextToken,'user'=>$user]);
    }
    public function logout(Request $r){ $r->user()->currentAccessToken()->delete(); return response()->json(['message'=>'Logged out']); }
    public function me(Request $r){ return response()->json($r->user()->load('vendor','school')); }

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

