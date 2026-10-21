<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Branding for school + coaching panels: one logo + one banner per
 * institute, stored as public-disk URLs on `institute_profiles`.
 */
return new class extends Migration {
    public function up(): void {
        Schema::table('institute_profiles', function (Blueprint $t) {
            $t->string('logo_url')->nullable()->after('website');
            $t->string('banner_url')->nullable()->after('logo_url');
        });
    }

    public function down(): void {
        Schema::table('institute_profiles', function (Blueprint $t) {
            $t->dropColumn(['logo_url', 'banner_url']);
        });
    }
};
