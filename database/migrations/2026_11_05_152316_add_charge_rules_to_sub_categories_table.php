<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sub_categories', function (Blueprint $table) {
            $table->string('portal_charge_type', 16)->default('fixed');
            $table->decimal('portal_charge_value', 10, 2)->default(0);
            $table->string('server_charge_type', 16)->default('fixed');
            $table->decimal('server_charge_value', 10, 2)->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sub_categories', function (Blueprint $table) {
            $table->dropColumn([
                'portal_charge_type',
                'portal_charge_value',
                'server_charge_type',
                'server_charge_value',
            ]);
        });
    }
};
