<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Canonical: mirrors docs/database_part4.sql + part5.sql (settings/locations/addresses/otps/logs)
return new class extends Migration {
    public function up(): void {
        Schema::create('settings', function (Blueprint $t) {
            $t->string('key',120)->primary(); $t->text('value')->nullable();
            $t->string('group',60)->default('general'); $t->boolean('is_secret')->default(false);
            $t->timestamp('updated_at')->nullable();
        });
        Schema::create('countries', function (Blueprint $t) {
            $t->id(); $t->string('name',120); $t->char('iso2',2)->unique();
            $t->string('phonecode',10)->nullable(); $t->boolean('is_active')->default(true);
        });
        Schema::create('states', function (Blueprint $t) {
            $t->id(); $t->foreignId('country_id')->constrained()->cascadeOnDelete();
            $t->string('name',120); $t->string('code',20)->nullable();
        });
        Schema::create('districts', function (Blueprint $t) {
            $t->id(); $t->foreignId('state_id')->constrained()->cascadeOnDelete();
            $t->string('name',120);
        });
        Schema::create('cities', function (Blueprint $t) {
            $t->id(); $t->foreignId('district_id')->constrained()->cascadeOnDelete();
            $t->string('name',120); $t->string('pincode',10)->nullable();
        });
        Schema::create('addresses', function (Blueprint $t) {
            $t->id(); $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('label',60)->default('home'); $t->string('line1',255);
            $t->string('line2',255)->nullable();
            $t->foreignId('country_id')->nullable()->nullOnDelete();
            $t->foreignId('state_id')->nullable()->nullOnDelete();
            $t->foreignId('district_id')->nullable()->nullOnDelete();
            $t->foreignId('city_id')->nullable()->nullOnDelete();
            $t->string('pincode',10); $t->string('phone',20)->nullable();
            $t->boolean('is_default')->default(false); $t->timestamps();
        });
        Schema::create('otps', function (Blueprint $t) {
            $t->id(); $t->string('identifier',190); $t->string('otp',10);
            $t->timestamp('expires_at'); $t->boolean('is_verified')->default(false);
            $t->integer('attempts')->default(0); $t->timestamp('created_at')->nullable();
            $t->index('identifier');
        });
        Schema::create('payment_logs', function (Blueprint $t) {
            $t->id(); $t->string('event',120)->nullable(); $t->longText('payload')->nullable();
            $t->timestamp('created_at')->nullable();
        });
        Schema::table('vendors', function (Blueprint $t) {
            if (!Schema::hasColumn('vendors','address_id')) $t->foreignId('address_id')->nullable()->nullOnDelete();
        });
        Schema::table('schools', function (Blueprint $t) {
            if (!Schema::hasColumn('schools','address_id')) $t->foreignId('address_id')->nullable()->nullOnDelete();
        });
        $rows = [
            ['razorpay_key_id','rzp_test_XXXXXXXX','payment',0],
            ['razorpay_key_secret','test_secret_xxx','payment',1],
            ['razorpay_webhook_secret','whsec_xxx','payment',1],
            ['payment_mode','test','payment',0],
            ['mail_from_address','noreply@market.local','mail',0],
            ['otp_expiry_min','10','otp',0],
            ['delivery_modes','["self","thirdparty","school_pickup"]','general',0],
            ['commission_default','0','general',0],
        ];
        foreach ($rows as [$k,$v,$g,$s]) \DB::table('settings')->updateOrInsert(['key'=>$k],['value'=>$v,'group'=>$g,'is_secret'=>$s]);
    }
    public function down(): void {
        Schema::table('vendors', fn(Blueprint $t)=>$t->dropColumn('address_id'));
        Schema::table('schools', fn(Blueprint $t)=>$t->dropColumn('address_id'));
        foreach (['payment_logs','otps','addresses','cities','districts','states','countries','settings'] as $t) Schema::dropIfExists($t);
    }
};
