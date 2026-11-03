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
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('stock_reserved_until')->nullable();
            $table->timestamp('stock_released_at')->nullable();
            $table->index(['payment_status', 'stock_reserved_until']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['payment_status', 'stock_reserved_until']);
            $table->dropColumn(['stock_reserved_until', 'stock_released_at']);
        });
    }
};
