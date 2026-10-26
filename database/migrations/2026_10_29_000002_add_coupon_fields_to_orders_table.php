<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('orders')) return;
        Schema::table('orders', function (Blueprint $t) {
            if (!Schema::hasColumn('orders', 'coupon_code')) $t->string('coupon_code', 64)->nullable()->after('total');
            if (!Schema::hasColumn('orders', 'coupon_discount')) $t->decimal('coupon_discount', 12, 2)->nullable()->after('coupon_code');
            if (!Schema::hasColumn('orders', 'coupon_id')) $t->foreignId('coupon_id')->nullable()->after('coupon_discount')->constrained('coupons')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('orders')) return;
        Schema::table('orders', function (Blueprint $t) {
            $cols = [];
            foreach (['coupon_code', 'coupon_discount', 'coupon_id'] as $c) {
                if (Schema::hasColumn('orders', $c)) $cols[] = $c;
            }
            if ($cols) $t->dropColumn($cols);
        });
    }
};
