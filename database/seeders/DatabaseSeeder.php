<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\{User,Category,CategoryField,Vendor,School};
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

// Canonical demo seed: local-only demo logins. Production: run with --class=ProductionSeeder (no demo users).
class DatabaseSeeder extends Seeder {
    public function run(): void {
        $admin = User::firstOrCreate(['email'=>'admin@market.local'],['name'=>'Super Admin','whatsapp'=>'9000000001','password'=>Hash::make('Admin@123'),'role'=>'admin']);
        $v = User::firstOrCreate(['email'=>'vendor1@market.local'],['name'=>'Vendor One','whatsapp'=>'9000000002','password'=>Hash::make('Vendor@123'),'role'=>'vendor']);
        $vendor = Vendor::firstOrCreate(['user_id'=>$v->id],['shop_name'=>'Vendor One Store']);
        $s = User::firstOrCreate(['email'=>'school1@market.local'],['name'=>'School One','whatsapp'=>'9000000003','password'=>Hash::make('School@123'),'role'=>'school']);
        $sch = School::firstOrCreate(['school_code'=>'SCH001'],['user_id'=>$s->id,'name'=>'Demo Public School','is_independent'=>true,'class_list'=>['1','2','3']]);
        DB::table('school_vendor')->updateOrInsert(['school_id'=>$sch->id,'vendor_id'=>$vendor->id],['royalty_percent'=>10,'is_active'=>1]);
        $book = Category::firstOrCreate(['slug'=>'book'],['name'=>'Book']);
        $bundle = Category::firstOrCreate(['slug'=>'book-bundle'],['name'=>'Book Bundle']);
        $bottle = Category::firstOrCreate(['slug'=>'water-bottle'],['name'=>'Water Bottle']);
        $fields = [
            [$book->id,'author','Author','text',1,1],[$book->id,'publisher','Publisher','text',1,2],
            [$book->id,'class','Class','text',1,3],[$book->id,'isbn','ISBN','text',0,4],
            [$bundle->id,'bundle_items','Bundle Items','textarea',1,1],[$bundle->id,'class','Class','text',1,2],
            [$bottle->id,'capacity_ml','Capacity (ml)','number',1,1],[$bottle->id,'material','Material','select',1,2],
        ];
        foreach($fields as $f) CategoryField::firstOrCreate(['category_id'=>$f[0],'field_name'=>$f[1]],['field_label'=>$f[2],'field_type'=>$f[3],'is_required'=>$f[4],'sort_order'=>$f[5],'options'=>$f[1]==='material'?['steel','plastic','copper']:null]);
        // NOTE: locations (countries/states/districts/areas + country_phonecodes) are the REAL
        // imported tables and are NOT seeded here. Load them with the SQL import
        // (docs/database_part*.sql + docs/locations_india.sql) - see docs/SETUP.md.
    }
}
