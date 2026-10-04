<?php
namespace App\Http\Controllers;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller {
    // GET /admin/settings – all (secrets masked unless ?show=1)
    public function index(Request $r){
        $all=Setting::all()->map(function($s) use ($r){
            if($s->is_secret && !$r->show) $s->value='****'.substr((string)$s->value,-4);
            return $s;
        });
        return response()->json($all);
    }
    // PUT /admin/settings – {key: value} bulk upsert (admin manageable)
    // NOTE: updateOrCreate (not where()->update()) so brand-new keys created from the
    // Admin UI (branding_logo, app_name, …) are INSERTED instead of silently no-op'ing.
    public function update(Request $r){
        $d=$r->validate(['settings'=>'required|array']);
        $saved=[];
        foreach($d['settings'] as $k=>$v){
            $val=is_array($v)?json_encode($v):(string)$v;
            Setting::updateOrCreate(
                ['key'=>$k],
                ['value'=>$val,'group'=>$this->groupFor($k),'is_secret'=>Setting::where('key',$k)->value('is_secret')??false,'updated_at'=>now()]
            );
            $saved[]=$k;
        }
        return response()->json(['saved'=>true,'keys'=>$saved]);
    }
    // GET /admin/settings/public – safe keys for checkout UIs
    // Deliberately unauthenticated: the Login page renders the logo before sign-in.
    public function public(){
        return response()->json([
            'razorpay_key_id'=>Setting::getVal('razorpay_key_id'),
            'payment_mode'=>Setting::getVal('payment_mode','test'),
            'app_name'=>Setting::getVal('app_name',config('app.name')),
            'branding_logo'=>Setting::getVal('branding_logo'),
            'brand_primary'=>Setting::getVal('brand_primary'),
        ]);
    }
    // POST /admin/settings/test-mail – verifies SMTP/Mailpit works
    public function testMail(Request $r){
        $d=$r->validate(['email'=>'required|email']);
        \Mail::raw('Marketplace test mail OK at '.now(), fn($m)=>$m->to($d['email'])->subject('Marketplace test mail'));
        return response()->json(['sent_to'=>$d['email'],'via'=>config('mail.default'),'host'=>config('mail.mailers.smtp.host')]);
    }

    // Group new keys sensibly so the Admin Settings screen stays organised.
    private function groupFor($k){
        if(str_starts_with($k,'branding_') || in_array($k,['app_name','brand_primary'],true)) return 'branding';
        if(str_starts_with($k,'razorpay_') || str_contains($k,'payment')) return 'payment';
        if(str_starts_with($k,'mail_')) return 'mail';
        if(str_starts_with($k,'otp_')) return 'otp';
        return 'general';
    }
}
