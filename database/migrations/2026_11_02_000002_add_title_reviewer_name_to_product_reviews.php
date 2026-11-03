<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('product_reviews', 'title')) {
            Schema::table('product_reviews', function (Blueprint $t) {
                $t->string('title', 255)->nullable()->after('comment');
            });
        }
        if (! Schema::hasColumn('product_reviews', 'reviewer_name')) {
            Schema::table('product_reviews', function (Blueprint $t) {
                $t->string('reviewer_name', 150)->nullable()->after('title');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('product_reviews', 'reviewer_name')) {
            Schema::table('product_reviews', function (Blueprint $t) {
                $t->dropColumn('reviewer_name');
            });
        }
        if (Schema::hasColumn('product_reviews', 'title')) {
            Schema::table('product_reviews', function (Blueprint $t) {
                $t->dropColumn('title');
            });
        }
    }
};
