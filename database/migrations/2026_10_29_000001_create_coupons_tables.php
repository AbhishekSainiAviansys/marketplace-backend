<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('coupons')) {
            Schema::create('coupons', function (Blueprint $t) {
                $t->id();
                $t->string('code', 64)->unique();
                $t->string('title', 150)->nullable();
                $t->text('description')->nullable();
                $t->string('type', 30)->default('promotional');
                $t->string('discount_type', 20)->default('percent');
                $t->decimal('discount_value', 12, 2)->default(0);
                $t->decimal('max_discount', 12, 2)->nullable();
                $t->decimal('min_order_amount', 12, 2)->nullable();
                $t->unsignedInteger('usage_limit')->nullable();
                $t->unsignedInteger('used_count')->default(0);
                $t->unsignedInteger('per_user_limit')->default(1);
                $t->timestamp('starts_at')->nullable();
                $t->timestamp('expires_at')->nullable();
                $t->boolean('is_active')->default(true);
                $t->timestamps();
            });
        }

        if (!Schema::hasTable('coupon_usages')) {
            Schema::create('coupon_usages', function (Blueprint $t) {
                $t->id();
                $t->foreignId('coupon_id')->constrained('coupons')->cascadeOnDelete();
                $t->foreignId('user_id')->constrained()->cascadeOnDelete();
                $t->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
                $t->timestamp('used_at')->nullable();
                $t->timestamps();
                $t->index(['coupon_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('coupon_usages');
        Schema::dropIfExists('coupons');
    }
};
