<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

// Maps REAL imported tables: countries(country_id) / states(state_subdivision_id varchar)
// / districts(id) / areas(id replaces cities) + phone country codes.
// Safe to run on live DB already altered via SQL: uses hasColumn/hasTable guards.
return new class extends Migration {
    public function up(): void {
        if (!Schema::hasTable('country_phonecodes')) {
            Schema::create('country_phonecodes', function (Blueprint $t) {
                $t->integer('country_id')->primary();
                $t->string('country_name',100); $t->char('iso2',2);
                $t->string('dial_code',8); $t->boolean('is_default')->default(false);
            });
        }
        $codes = ['IN'=>'+91','AF'=>'+93','AZ'=>'+994','GE'=>'+995','HN'=>'+504','TL'=>'+670','TR'=>'+90'];
        foreach (DB::table('countries')->whereIn('country_code_char2', array_keys($codes))->get() as $c) {
            DB::table('country_phonecodes')->updateOrInsert(['country_id'=>$c->country_id],[
                'country_name'=>$c->country_name,'iso2'=>$c->country_code_char2,
                'dial_code'=>$codes[$c->country_code_char2],'is_default'=>$c->country_id==105?1:0,
            ]);
        }
        // addresses: remap to real PK types (country INT, state VARCHAR, district INT, area INT), drop city_id
        Schema::table('addresses', function (Blueprint $t) {
            if (Schema::hasColumn('addresses','country_id')) $t->integer('country_id')->nullable()->change();
            if (Schema::hasColumn('addresses','state_id')) $t->string('state_id',20)->nullable()->change();
            if (Schema::hasColumn('addresses','district_id')) $t->integer('district_id')->nullable()->change();
            if (Schema::hasColumn('addresses','city_id')) $t->dropColumn('city_id');
            if (!Schema::hasColumn('addresses','area_id')) $t->integer('area_id')->nullable()->after('district_id');
            if (!Schema::hasColumn('addresses','phone_code')) $t->string('phone_code',8)->default('+91')->after('pincode');
        });
        Schema::table('users', function (Blueprint $t) {
            if (!Schema::hasColumn('users','phone_country_code')) $t->string('phone_country_code',8)->default('+91')->after('whatsapp');
            if (!Schema::hasColumn('users','phone_e164')) $t->string('phone_e164',25)->nullable()->unique()->after('phone_country_code');
        });
        // helper view for debugging the full chain
        DB::statement('CREATE OR REPLACE VIEW v_locations_full AS SELECT a.id AS area_id, a.area_code, a.city_name AS area_label, a.status, d.id AS district_id, d.district_name, s.state_subdivision_id AS state_id, s.state_subdivision_name AS state_name, c.country_id, c.country_name FROM areas a LEFT JOIN districts d ON d.id=a.district_id LEFT JOIN states s ON s.state_subdivision_id=a.state_id LEFT JOIN countries c ON c.country_id=a.country_id');
    }
    public function down(): void {
        DB::statement('DROP VIEW IF EXISTS v_locations_full');
        Schema::dropIfExists('country_phonecodes');
    }
};
