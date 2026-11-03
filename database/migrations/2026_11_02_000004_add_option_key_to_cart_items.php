<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('cart_items', 'option_key')) {
            Schema::table('cart_items', function (Blueprint $table) {
                $table->string('option_key', 64)->default('default')->after('size');
            });
        }

        $indexes = collect(Schema::getIndexes('cart_items'))->pluck('name');
        if (! $indexes->contains('cart_items_option_key_unique')) {
            Schema::table('cart_items', function (Blueprint $table) {
                $table->unique(['cart_id', 'product_id', 'option_key'], 'cart_items_option_key_unique');
            });
        }

        $indexes = collect(Schema::getIndexes('cart_items'))->pluck('name');
        foreach (['cart_items_cart_id_product_id_unique', 'cart_items_unique_line'] as $name) {
            if ($indexes->contains($name)) {
                Schema::table('cart_items', function (Blueprint $table) use ($name) {
                    $table->dropUnique($name);
                });
            }
        }

    }

    public function down(): void
    {
        if (collect(Schema::getIndexes('cart_items'))->pluck('name')->contains('cart_items_option_key_unique')) {
            Schema::table('cart_items', function (Blueprint $table) {
                $table->dropUnique('cart_items_option_key_unique');
            });
        }

        if (! collect(Schema::getIndexes('cart_items'))->pluck('name')->contains('cart_items_unique_line')) {
            Schema::table('cart_items', function (Blueprint $table) {
                $table->unique(['cart_id', 'product_id', 'color', 'size'], 'cart_items_unique_line');
            });
        }
        if (! collect(Schema::getIndexes('cart_items'))->pluck('name')->contains('cart_items_cart_id_product_id_unique')) {
            Schema::table('cart_items', function (Blueprint $table) {
                $table->unique(['cart_id', 'product_id']);
            });
        }

        if (Schema::hasColumn('cart_items', 'option_key')) {
            Schema::table('cart_items', function (Blueprint $table) {
                $table->dropColumn('option_key');
            });
        }
    }
};
