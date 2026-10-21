<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * School / educational institute onboarding (Amazon-style application flow).
 *
 * Additive only: `onboarding_status` defaults to 'approved' so every existing
 * school row keeps working without a backfill. New self-registrations are
 * explicitly created as 'draft' by AuthController::register and stay locked
 * out of login until an admin approves them.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $t) {
            // Full application payload (institution/affiliation/contact/classes
            // sections + uploaded document URLs). JSON keeps the schema flexible
            // as the form evolves — mirrors the settings-table approach.
            $t->json('onboarding')->nullable();
            $t->string('onboarding_status', 20)->default('approved');
            $t->timestamp('submitted_at')->nullable();
            $t->timestamp('reviewed_at')->nullable();
            $t->text('review_notes')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $t) {
            $t->dropColumn(['onboarding', 'onboarding_status', 'submitted_at', 'reviewed_at', 'review_notes']);
        });
    }
};