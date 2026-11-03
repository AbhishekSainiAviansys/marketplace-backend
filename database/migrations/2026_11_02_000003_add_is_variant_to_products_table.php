<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('products', 'is_variant')) {
            Schema::table('products', function (Blueprint $t) {
                $t->boolean('is_variant')->default(false)->after('stock');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('products', 'is_variant')) {
            Schema::table('products', function (Blueprint $t) {
                $t->dropColumn('is_variant');
            });
        }
    }
};
