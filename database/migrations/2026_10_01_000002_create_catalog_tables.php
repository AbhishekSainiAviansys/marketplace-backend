<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Canonical: mirrors docs/database_part2.sql (fixed FKs + notifications.type)
return new class extends Migration {
    public function up(): void {
        Schema::create('products', function (Blueprint $t) {
            $t->id(); $t->foreignId('category_id')->constrained()->restrictOnDelete();
            $t->string('created_by_type',20); $t->unsignedBigInteger('created_by_id');
            $t->foreignId('school_id')->nullable()->nullOnDelete();
            $t->foreignId('vendor_id')->nullable()->nullOnDelete();
            $t->string('name'); $t->string('sku',60)->unique()->nullable();
            $t->decimal('price',10,2); $t->decimal('mrp',10,2)->nullable();
            $t->integer('stock')->default(0);
            $t->enum('delivery_mode',['self','thirdparty','school_pickup'])->default('self');
            $t->json('payment_split')->nullable(); $t->boolean('is_active')->default(true); $t->timestamps();
        });
        Schema::create('product_values', function (Blueprint $t) {
            $t->id(); $t->foreignId('product_id')->constrained()->cascadeOnDelete();
            $t->foreignId('field_id')->references('id')->on('category_fields')->cascadeOnDelete();
            $t->text('value_text')->nullable(); $t->unique(['product_id','field_id']);
        });
        Schema::create('product_images', function (Blueprint $t) {
            $t->id(); $t->foreignId('product_id')->constrained()->cascadeOnDelete();
            $t->string('url',500); $t->boolean('is_primary')->default(false);
        });
        Schema::create('notifications', function (Blueprint $t) {
            $t->id(); $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('title'); $t->text('body')->nullable(); $t->string('type',60)->nullable();
            $t->boolean('is_read')->default(false); $t->timestamps();
        });
        Schema::create('students', function (Blueprint $t) {
            $t->id(); $t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $t->string('class_name',50)->nullable();
            $t->foreignId('school_id')->nullable()->nullOnDelete();
            $t->text('address')->nullable();
        });
    }
    public function down(): void {
        foreach (['students','notifications','product_images','product_values','products'] as $t) Schema::dropIfExists($t);
    }
};
