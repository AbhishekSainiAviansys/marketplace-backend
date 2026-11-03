<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('products', 'avg_rating')) {
            Schema::table('products', function (Blueprint $t) {
                $t->integer('avg_rating')->default(0)->after('stock');
            });
        }
        if (! Schema::hasColumn('products', 'reviews_count')) {
            Schema::table('products', function (Blueprint $t) {
                $t->integer('reviews_count')->default(0)->after('avg_rating');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('products', 'avg_rating')) {
            Schema::table('products', function (Blueprint $t) {
                $t->dropColumn('avg_rating');
            });
        }
        if (Schema::hasColumn('products', 'reviews_count')) {
            Schema::table('products', function (Blueprint $t) {
                $t->dropColumn('reviews_count');
            });
        }
    }
};
