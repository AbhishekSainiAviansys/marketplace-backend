<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('product_stock')) {
            Schema::create('product_stock', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->foreignId('variant_id')->nullable()->nullOnDelete()->constrained('product_variants');
                $table->string('colour', 60)->nullable();
                $table->string('color', 60)->nullable();
                $table->string('size', 60)->nullable();
                $table->integer('quantity')->default(0);
                $table->integer('stock')->default(0);
                $table->integer('qty')->default(0);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('stock_tracking')) {
            Schema::create('stock_tracking', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->foreignId('variant_id')->nullable()->nullOnDelete()->constrained('product_variants');
                $table->string('colour', 60)->nullable();
                $table->string('color', 60)->nullable();
                $table->string('size', 60)->nullable();
                $table->integer('delta')->default(0);
                $table->integer('quantity')->default(0);
                $table->integer('change')->default(0);
                $table->integer('qty')->default(0);
                $table->string('reason', 120)->nullable();
                $table->timestamp('created_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_tracking');
        Schema::dropIfExists('product_stock');
    }
};
