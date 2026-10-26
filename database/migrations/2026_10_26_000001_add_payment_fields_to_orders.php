<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('orders', function (Blueprint $t) {
            $t->string('payment_status', 20)->default('unpaid')->after('status');
            $t->string('payment_provider', 30)->nullable()->after('payment_status');
            $t->string('provider_order_id', 64)->nullable()->index()->after('payment_provider');
            $t->string('payment_ref', 64)->nullable()->index()->after('provider_order_id');
            $t->timestamp('paid_at')->nullable()->after('payment_ref');
        });
    }

    public function down(): void {
        Schema::table('orders', function (Blueprint $t) {
            $t->dropColumn(['payment_status','payment_provider','provider_order_id','payment_ref','paid_at']);
        });
    }
};
