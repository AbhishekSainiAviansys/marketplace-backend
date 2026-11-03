<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('cart_items', 'color')) {
            Schema::table('cart_items', function (Blueprint $t) {
                $t->string('color', 60)->nullable()->after('product_id');
            });
        }
        if (! Schema::hasColumn('cart_items', 'size')) {
            Schema::table('cart_items', function (Blueprint $t) {
                $t->string('size', 60)->nullable()->after('color');
            });
        }
        if (! Schema::hasColumn('cart_items', 'cart_items_unique_line')) {
            Schema::table('cart_items', function (Blueprint $t) {
                $t->unique(['cart_id', 'product_id', 'color', 'size'], 'cart_items_unique_line');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('cart_items', 'cart_items_unique_line')) {
            Schema::table('cart_items', function (Blueprint $t) {
                $t->dropUnique('cart_items_unique_line');
            });
        }
        if (Schema::hasColumn('cart_items', 'color')) {
            Schema::table('cart_items', function (Blueprint $t) {
                $t->dropColumn(['color', 'size']);
            });
        }
    }
};
