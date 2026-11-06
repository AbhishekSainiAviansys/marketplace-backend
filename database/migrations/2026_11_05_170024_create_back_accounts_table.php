<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     *
     * One back_accounts row per user stores the user back account name
     * and Razorpay account ID (the account ID the merchant sees in the
     * Razorpay dashboard). Nullable so students and guest accounts can still
     * register; only seller or institute accounts ever populate it.
     */
    public function up(): void
    {
        Schema::create('back_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id') -> unique() -> constrained() -> cascadeOnDelete();
            $table->string('account_name', 191)->nullable()->comment('Back account / merchant name');
            $table->string('account_id', 191)->nullable()->comment('Razorpay business account / account ID');
            $table->string('account_type', 32)->nullable()->default('razorpay');
            $table->string('status', 32)->nullable()->default('Active');
            $table->json('details')->nullable();
            $table->timestamps();
        });
    }
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('back_accounts');
    }
};
