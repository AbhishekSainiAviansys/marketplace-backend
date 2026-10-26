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
            if (!Schema::hasColumn('orders', 'subtotal')) $t->decimal('subtotal', 12, 2)->nullable()->after('items');
            if (!Schema::hasColumn('orders', 'delivery_charge')) $t->decimal('delivery_charge', 12, 2)->nullable()->after('subtotal');
            if (!Schema::hasColumn('orders', 'gst_rate')) $t->decimal('gst_rate', 5, 2)->nullable()->after('delivery_charge');
            if (!Schema::hasColumn('orders', 'gst_amount')) $t->decimal('gst_amount', 12, 2)->nullable()->after('gst_rate');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('orders')) return;
        Schema::table('orders', function (Blueprint $t) {
            $cols = [];
            foreach (['subtotal', 'delivery_charge', 'gst_rate', 'gst_amount'] as $c) {
                if (Schema::hasColumn('orders', $c)) $cols[] = $c;
            }
            if ($cols) $t->dropColumn($cols);
        });
    }
};
