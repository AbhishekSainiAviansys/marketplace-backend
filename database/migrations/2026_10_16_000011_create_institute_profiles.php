<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * institute_profiles — unified public details for schools and coaching institutes.
 *
 * Both schools (schools.id) and coaching institutes (coaching_institutes.id)
 * reference this table via (institute_type, institute_id). Holds the details
 * students see after filtering by country / state / district and clicking
 * "View details": website, contact, location, registration, board, etc.
 *
 * Dedicated country_id / state_id / district_id columns let the directory
 * filter both school and coaching rows uniformly (no JSON_EXTRACT needed).
 */
return new class extends Migration {
    public function up(): void {
        Schema::create('institute_profiles', function (Blueprint $t) {
            $t->id();
            $t->string('institute_type', 20);          // 'school' | 'coaching'
            $t->unsignedBigInteger('institute_id');     // schools.id or coaching_institutes.id
            $t->unique(['institute_type','institute_id']);
            $t->string('website')->nullable();
            $t->string('contact_person')->nullable();
            $t->string('contact_phone')->nullable();
            $t->string('contact_email')->nullable();
            $t->text('detailed_address')->nullable();
            $t->unsignedInteger('country_id')->nullable();
            $t->string('state_id', 32)->nullable();
            $t->unsignedInteger('district_id')->nullable();
            $t->string('established_year')->nullable();
            $t->string('registration_number')->nullable();
            $t->string('board_affiliation')->nullable();    // school board / coaching affiliation
            $t->string('recognition_status')->nullable();
            $t->string('medium_of_instruction')->nullable();
            $t->string('student_strength')->nullable();
            $t->json('streams')->nullable();               // e.g. ['Science','Commerce']
            $t->json('classes')->nullable();               // e.g. ['Class 1','Class 2']
            $t->timestamps();

            $t->index(['institute_type','institute_id']);
            $t->index(['country_id','state_id','district_id']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('institute_profiles');
    }
};
