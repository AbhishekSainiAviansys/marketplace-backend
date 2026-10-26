<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('carts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->timestamps();
            $t->unique('user_id');
        });

        Schema::create('cart_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->constrained()->cascadeOnDelete();
            $t->unsignedInteger('qty')->default(1);
            $t->timestamps();
            $t->unique(['cart_id', 'product_id']);
        });

        Schema::create('wishlist_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->constrained()->cascadeOnDelete();
            $t->timestamps();
            $t->unique(['user_id', 'product_id']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('wishlist_items');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
    }
};
