<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('credentials')) {
            return;
        }
        Schema::create('credentials', function (Blueprint $t) {
            $t->id();
            $t->string('title', 120);
            $t->text('public')->nullable();
            $t->text('private')->nullable();
            $t->text('api')->nullable();
            $t->text('desc')->nullable();
            $t->string('status', 30)->default('Active');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credentials');
    }
};