<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

// Production seed: NO demo users. Only masters + settings skeleton.
class ProductionSeeder extends Seeder {
    public function run(): void {
        foreach ([['book','Book'],['book-bundle','Book Bundle'],['water-bottle','Water Bottle']] as [$slug,$name]) {
            DB::table('categories')->updateOrInsert(['slug'=>$slug],['name'=>$name,'is_active'=>1]);
        }
        DB::table('countries')->updateOrInsert(['iso2'=>'IN'],['name'=>'India','phonecode'=>'91','is_active'=>1]);
        foreach (['razorpay_key_id','razorpay_key_secret','razorpay_webhook_secret','payment_mode','mail_from_address','otp_expiry_min'] as $k) {
            DB::table('settings')->updateOrInsert(['key'=>$k],['value'=>'','group'=>'payment','is_secret'=>str_contains($k,'secret')?1:0]);
        }
    }
}
