<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Coaching institute keywords — searchable tags each institute owns.
 * Students filter the directory by these keywords via ?q=.
 */
return new class extends Migration {
    public function up(): void {
        Schema::create('coaching_keywords', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('coaching_institute_id');
            $t->string('keyword', 100);
            $t->timestamps();

            $t->foreign('coaching_institute_id')
              ->references('id')->on('coaching_institutes')
              ->onDelete('cascade');

            $t->unique(['coaching_institute_id', 'keyword']);
            $t->index('keyword');
            $t->index('coaching_institute_id');
        });
    }

    public function down(): void {
        Schema::dropIfExists('coaching_keywords');
    }
};