<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasTable('orders')) return;
        Schema::table('orders', function (Blueprint $t) {
            if (!Schema::hasColumn('orders', 'tracking_number')) $t->string('tracking_number', 120)->nullable();
            if (!Schema::hasColumn('orders', 'courier')) $t->string('courier', 120)->nullable();
            if (!Schema::hasColumn('orders', 'tracking_url')) $t->string('tracking_url', 500)->nullable();
            if (!Schema::hasColumn('orders', 'shipped_at')) $t->timestamp('shipped_at')->nullable();
            if (!Schema::hasColumn('orders', 'delivered_at')) $t->timestamp('delivered_at')->nullable();
            if (!Schema::hasColumn('orders', 'cancelled_at')) $t->timestamp('cancelled_at')->nullable();
            if (!Schema::hasColumn('orders', 'refunded_at')) $t->timestamp('refunded_at')->nullable();
            if (!Schema::hasColumn('orders', 'refund_ref')) $t->string('refund_ref', 120)->nullable();
            if (!Schema::hasColumn('orders', 'admin_note')) $t->text('admin_note')->nullable();
            if (!Schema::hasColumn('orders', 'last_notified_at')) $t->timestamp('last_notified_at')->nullable();
        });
    }

    public function down(): void {
        if (!Schema::hasTable('orders')) return;
        Schema::table('orders', function (Blueprint $t) {
            $cols = [];
            foreach (['tracking_number','courier','tracking_url','shipped_at','delivered_at','cancelled_at','refunded_at','refund_ref','admin_note','last_notified_at'] as $c) {
                if (Schema::hasColumn('orders', $c)) $cols[] = $c;
            }
            if ($cols) $t->dropColumn($cols);
        });
    }
};