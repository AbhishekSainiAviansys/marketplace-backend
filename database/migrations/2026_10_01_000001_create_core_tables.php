<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Canonical: mirrors docs/database_part1.sql (core: users/vendors/schools/royalty/categories/fields)
return new class extends Migration {
    public function up(): void {
        Schema::create('users', function (Blueprint $t) {
            $t->id(); $t->string('name',150);
            $t->string('email')->unique()->nullable();
            $t->string('whatsapp',20)->unique()->nullable();
            $t->string('password'); $t->enum('role',['admin','vendor','school','student'])->default('vendor');
            $t->boolean('is_active')->default(true); $t->timestamp('email_verified_at')->nullable();
            $t->rememberToken(); $t->timestamps();
        });
        Schema::create('vendors', function (Blueprint $t) {
            $t->id(); $t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $t->string('shop_name'); $t->string('gst',30)->nullable(); $t->text('address')->nullable();
            $t->decimal('commission_default',5,2)->default(0); $t->timestamps();
        });
        Schema::create('schools', function (Blueprint $t) {
            $t->id(); $t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $t->string('school_code',20)->unique(); $t->string('name');
            $t->text('address')->nullable(); $t->boolean('is_independent')->default(false);
            $t->json('class_list')->nullable(); $t->timestamps();
        });
        Schema::create('school_vendor', function (Blueprint $t) {
            $t->id(); $t->foreignId('school_id')->constrained()->cascadeOnDelete();
            $t->foreignId('vendor_id')->constrained()->cascadeOnDelete();
            $t->decimal('royalty_percent',5,2)->default(0); $t->boolean('is_active')->default(true);
            $t->timestamps(); $t->unique(['school_id','vendor_id']);
        });
        Schema::create('categories', function (Blueprint $t) {
            $t->id(); $t->string('name',120); $t->string('slug')->unique();
            $t->text('description')->nullable(); $t->boolean('is_active')->default(true); $t->timestamps();
        });
        Schema::create('category_fields', function (Blueprint $t) {
            $t->id(); $t->foreignId('category_id')->constrained()->cascadeOnDelete();
            $t->string('field_name',80); $t->string('field_label',120);
            $t->enum('field_type',['text','number','textarea','select','file','date','checkbox'])->default('text');
            $t->json('options')->nullable(); $t->boolean('is_required')->default(false);
            $t->integer('sort_order')->default(0);
        });
    }
    public function down(): void {
        foreach (['category_fields','categories','school_vendor','schools','vendors','users'] as $t) Schema::dropIfExists($t);
    }
};
