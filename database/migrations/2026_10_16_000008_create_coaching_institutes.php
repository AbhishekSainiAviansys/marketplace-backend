<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Coaching centres / private tutor institutes - a SEPARATE directory table.
 *
 * Schools keep living in `schools`; coaching centres and private tutor
 * institutes register into `coaching_institutes` with their own code, an
 * institute_type discriminator (private_coaching | private_institute) and the
 * country/state/district columns the student directory filters on.
 *
 * Adds the `coaching` role to users.role - the new /coaching/* panel is
 * guarded by role:coaching. onboarding_status defaults to 'approved' because
 * this flow activates instantly (no admin review step, unlike schools).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->enum('role', ['admin', 'vendor', 'school', 'student', 'coaching'])
                ->default('vendor')->change();
        });

        Schema::create('coaching_institutes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $t->string('institute_code', 20)->unique();
            $t->string('name');
            // private_coaching = tuition/coaching centres, private_institute = tutor institutes.
            $t->string('institute_type', 40);
            $t->text('address')->nullable();
            // Location ids mirror the REAL reference tables (countries.country_id,
            // states.state_subdivision_id, districts.id). Plain indexed columns on
            // purpose: the reference data is loaded from SQL dumps, so FKs would
            // break whenever a dump row is re-imported.
            $t->unsignedInteger('country_id')->nullable();
            $t->string('state_id', 32)->nullable();
            $t->unsignedInteger('district_id')->nullable();
            // Full registration payload (basic details + whatever the form grows
            // into) - same JSON approach as schools/vendors onboarding.
            $t->json('onboarding')->nullable();
            $t->string('onboarding_status', 20)->default('approved');
            $t->timestamp('submitted_at')->nullable();
            $t->timestamp('reviewed_at')->nullable();
            $t->text('review_notes')->nullable();
            $t->timestamps();
            $t->index(['country_id', 'state_id', 'district_id']);
            $t->index(['institute_type', 'onboarding_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coaching_institutes');
        // Demote any coaching users before the enum value disappears, otherwise
        // strict-mode MariaDB refuses the column change.
        \DB::table('users')->where('role', 'coaching')->update(['role' => 'student']);
        Schema::table('users', function (Blueprint $t) {
            $t->enum('role', ['admin', 'vendor', 'school', 'student'])
                ->default('vendor')->change();
        });
    }
};