<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('categories', 'is_size')) {
            Schema::table('categories', function (Blueprint $t) {
                $t->boolean('is_size')->default(false)->after('is_active');
            });
        }
        if (!Schema::hasColumn('categories', 'is_colour')) {
            Schema::table('categories', function (Blueprint $t) {
                $t->boolean('is_colour')->default(false)->after('is_size');
            });
        }

        if (!Schema::hasTable('sub_categories')) {
            Schema::create('sub_categories', function (Blueprint $t) {
                $t->id();
                $t->foreignId('category_id')->constrained()->cascadeOnDelete();
                $t->string('name', 120);
                $t->string('slug')->unique();
                $t->text('description')->nullable();
                $t->string('icon')->nullable();
                $t->boolean('is_active')->default(true);
                $t->timestamps();
            });
        }

        if (!Schema::hasColumn('products', 'sub_category_id')) {
            Schema::table('products', function (Blueprint $t) {
                $t->foreignId('sub_category_id')->nullable()->nullOnDelete()->constrained('sub_categories');
            });
        }

        if (!Schema::hasTable('product_variants')) {
            Schema::create('product_variants', function (Blueprint $t) {
                $t->id();
                $t->foreignId('product_id')->constrained()->cascadeOnDelete();
                $t->string('size', 60)->nullable();
                $t->string('color', 60)->nullable();
                $t->string('sku', 60)->nullable();
                $t->decimal('price', 10, 2)->nullable();
                $t->integer('stock')->default(0);
                $t->timestamps();
                $t->unique(['product_id', 'size', 'color']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
        if (Schema::hasColumn('products', 'sub_category_id')) {
            Schema::table('products', function (Blueprint $t) {
                $t->dropConstrainedForeignId('sub_category_id');
            });
        }
        Schema::dropIfExists('sub_categories');
        if (Schema::hasColumn('categories', 'is_colour')) {
            Schema::table('categories', function (Blueprint $t) { $t->dropColumn('is_colour'); });
        }
        if (Schema::hasColumn('categories', 'is_size')) {
            Schema::table('categories', function (Blueprint $t) { $t->dropColumn('is_size'); });
        }
    }
};
