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
    public function update(Request $r){
        $d=$r->validate(['settings'=>'required|array']);
        foreach($d['settings'] as $k=>$v){
            Setting::where('key',$k)->update(['value'=>is_array($v)?json_encode($v):$v,'updated_at'=>now()]);
        }
        return response()->json(['saved'=>true]);
    }
    // GET /admin/settings/public – safe keys for checkout UIs
    public function public(){
        return response()->json([
            'razorpay_key_id'=>Setting::getVal('razorpay_key_id'),
            'payment_mode'=>Setting::getVal('payment_mode','test'),
        ]);
    }
    // POST /admin/settings/test-mail – verifies SMTP/Mailpit works
    public function testMail(Request $r){
        $d=$r->validate(['email'=>'required|email']);
        \Mail::raw('Marketplace test mail OK at '.now(), fn($m)=>$m->to($d['email'])->subject('Marketplace test mail'));
        return response()->json(['sent_to'=>$d['email'],'via'=>config('mail.default'),'host'=>config('mail.mailers.smtp.host')]);
    }
}
