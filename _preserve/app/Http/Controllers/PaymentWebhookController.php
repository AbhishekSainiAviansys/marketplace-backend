<?php
namespace App\Http\Controllers;
use App\Models\Setting;
use Illuminate\Http\Request;

class PaymentWebhookController extends Controller {
    // Public Razorpay webhook – secret from admin settings
    public function razorpay(Request $r){
        $secret = Setting::getVal('razorpay_webhook_secret','');
        $sig = $r->header('X-Razorpay-Signature','');
        $payload = $r->getContent();
        $expected = hash_hmac('sha256', $payload, $secret);
        \Log::info('Razorpay webhook', ['valid'=>$sig===$expected,'event'=>json_decode($payload,true)['event']??null]);
        if($sig===''||!hash_equals($expected,$sig)) return response()->json(['message'=>'Invalid signature'],400);
        \DB::table('payment_logs')->insert(['event'=>json_decode($payload,true)['event']??'unknown','payload'=>$payload,'created_at'=>now()]);
        return response()->json(['ok'=>true]);
    }
}
