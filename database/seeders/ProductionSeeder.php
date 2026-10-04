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
        // Locations are the REAL imported tables (countries/states/districts/areas +
        // country_phonecodes) and are NOT seeded here - load them via the SQL import.
        foreach (['razorpay_key_id','razorpay_key_secret','razorpay_webhook_secret','payment_mode','mail_from_address','otp_expiry_min'] as $k) {
            if (! DB::table('settings')->where('key',$k)->exists()) {
                DB::table('settings')->insert(['key'=>$k,'value'=>'','group'=>'payment','is_secret'=>str_contains($k,'secret')?1:0]);
            }
        }
    }
}
