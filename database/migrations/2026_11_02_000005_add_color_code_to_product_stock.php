<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['product_stock', 'stock_tracking'] as $tableName) {
            if (Schema::hasTable($tableName) && ! Schema::hasColumn($tableName, 'color_code')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->string('color_code', 7)->nullable();
                });
            }
        }
    }

    public function down(): void
    {
        foreach (['product_stock', 'stock_tracking'] as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'color_code')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropColumn('color_code');
                });
            }
        }
    }
};
