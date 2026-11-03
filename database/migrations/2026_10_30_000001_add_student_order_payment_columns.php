<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            if (! Schema::hasColumn('orders', 'payment_status')) {
                $t->string('payment_status', 20)->default('unpaid')->after('status');
            }
            if (! Schema::hasColumn('orders', 'payment_provider')) {
                $t->string('payment_provider', 30)->nullable()->after('payment_status');
            }
            if (! Schema::hasColumn('orders', 'provider_order_id')) {
                $t->string('provider_order_id', 64)->nullable()->after('payment_provider');
            }
            if (! Schema::hasColumn('orders', 'payment_ref')) {
                $t->string('payment_ref', 64)->nullable()->after('provider_order_id');
            }
            if (! Schema::hasColumn('orders', 'paid_at')) {
                $t->timestamp('paid_at')->nullable()->after('payment_ref');
            }
            if (! Schema::hasColumn('orders', 'subtotal')) {
                $t->decimal('subtotal', 12, 2)->default(0)->after('total');
            }
            if (! Schema::hasColumn('orders', 'delivery_charge')) {
                $t->decimal('delivery_charge', 12, 2)->default(0)->after('subtotal');
            }
            if (! Schema::hasColumn('orders', 'gst_rate')) {
                $t->decimal('gst_rate', 5, 2)->default(0)->after('delivery_charge');
            }
            if (! Schema::hasColumn('orders', 'gst_amount')) {
                $t->decimal('gst_amount', 12, 2)->default(0)->after('gst_rate');
            }
            if (! Schema::hasColumn('orders', 'coupon_code')) {
                $t->string('coupon_code', 64)->nullable()->after('gst_amount');
            }
            if (! Schema::hasColumn('orders', 'coupon_discount')) {
                $t->decimal('coupon_discount', 12, 2)->default(0)->after('coupon_code');
            }
            if (! Schema::hasColumn('orders', 'coupon_id')) {
                $t->foreignId('coupon_id')->nullable()->constrained('coupons')->nullOnDelete()->after('coupon_discount');
            }
        });

        Schema::table('cart_items', function (Blueprint $t) {
            if (! Schema::hasColumn('cart_items', 'color')) {
                $t->string('color', 60)->nullable()->after('qty');
            }
            if (! Schema::hasColumn('cart_items', 'size')) {
                $t->string('size', 60)->nullable()->after('color');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->dropColumn(['payment_status', 'payment_provider', 'provider_order_id', 'payment_ref', 'paid_at', 'subtotal', 'delivery_charge', 'gst_rate', 'gst_amount', 'coupon_code', 'coupon_discount', 'coupon_id']);
        });
        Schema::table('cart_items', function (Blueprint $t) {
            $t->dropColumn(['color', 'size']);
        });
    }
};
